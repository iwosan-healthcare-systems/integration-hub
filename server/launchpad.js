export const VALUES = ['Empathetic', 'Ethical', 'Knowledge-driven', 'Innovative', 'Accessible'];
export const STATUSES = { submitted: 'Submitted', under_review: 'Under Review', successful: 'Successful', rejected: 'Rejected' };
export const canReviewLaunchpad = (u) => u?.role === 'admin' || u?.role === 'manager' || (u?.role === 'user' && u?.canReviewLaunchpad === true);
const reference = (id) => `IHS-${String(id).padStart(6, '0')}`;
const validDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
export function validateSubmission(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Please complete the form.');
  const answers = {};
  const fields = { department: ['Department',200], managerName: ['Line manager name',200], managerEmail: ['Line manager email',254], problem: ['The problem',5000], idea: ['Your idea',5000], testPlan: ['Where and with whom you will test it',5000], measurement: ['Success measurement',500], owner: ['Pilot owner',200], risks: ['Pilot risks',5000] };
  for (const [key,[label,max]] of Object.entries(fields)) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > max || (key !== 'risks' && !value.trim())) throw new Error(`${label} is required and must be at most ${max} characters.`);
    answers[key] = value.trim();
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answers.managerEmail)) throw new Error('Enter a valid line manager email address.');
  if (!Array.isArray(input.values) || !input.values.length || input.values.length > VALUES.length || input.values.some(v => !VALUES.includes(v))) throw new Error('Select at least one Iwosan value.');
  answers.values = [...new Set(input.values)];
  if (typeof input.funding !== 'number' || !Number.isFinite(input.funding) || input.funding < 0 || input.funding > 100000 || Math.abs(input.funding * 100 - Math.round(input.funding * 100)) > 0.00001) throw new Error('Funding must be between ₦0 and ₦100,000, with at most two decimal places.');
  answers.funding = input.funding;
  if (!validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate) throw new Error('Enter valid pilot dates, with the end on or after the start.');
  answers.startDate = input.startDate; answers.endDate = input.endDate;
  if (typeof input.managerSupported !== 'boolean') throw new Error('Select whether your line manager supports the idea.');
  answers.managerSupported = input.managerSupported;
  return answers;
}
// Inclusive calendar dates in Lagos, independent of database/server timezone.
export function buildFilters(query, entities) {
  const clauses = [], params = [];
  const add = (sql,v) => { params.push(v); clauses.push(sql.replace('?',`$${params.length}`)); };
  for (const key of ['status','entity','from','to','search']) if (query[key] !== undefined && typeof query[key] !== 'string') throw new Error(`Invalid ${key} filter.`);
  if (query.status) { if (!Object.hasOwn(STATUSES,query.status)) throw new Error('Invalid status filter.'); add('status = ?',query.status); }
  if (query.entity) {
    if (query.entity === 'unassigned') clauses.push('user_entity IS NULL');
    else { if (!Object.hasOwn(entities,query.entity)) throw new Error('Invalid entity filter.'); add('user_entity = ?',query.entity); }
  }
  if ((query.from && !validDate(query.from)) || (query.to && !validDate(query.to)) || (query.from && query.to && query.from > query.to)) throw new Error('Enter a valid date range.');
  if (query.from) add("submitted_at >= (?::date::timestamp AT TIME ZONE 'Africa/Lagos')",query.from);
  if (query.to) add("submitted_at < ((?::date + 1)::timestamp AT TIME ZONE 'Africa/Lagos')",query.to);
  if (query.search?.trim()) {
    if (query.search.length > 200) throw new Error('Search must be at most 200 characters.');
    params.push(`%${query.search.trim().replace(/[\\%_]/g,'\\$&')}%`);
    const n = `$${params.length}`;
    clauses.push(`(user_name ILIKE ${n} OR user_email ILIKE ${n} OR answers->>'idea' ILIKE ${n} OR ('IHS-' || LPAD(id::text, GREATEST(6,LENGTH(id::text)), '0')) ILIKE ${n})`);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}
const mapRow = r => ({ id:r.id, reference:reference(r.id), userName:r.user_name, userEmail:r.user_email, userEntity:r.user_entity, answers:r.answers, status:r.status, submittedAt:r.submitted_at, updatedAt:r.updated_at, version:r.version });
export function registerLaunchpadRoutes(router, { requireAuth, db, getPool, entities }) {
  const reviewer = (req,res,next) => canReviewLaunchpad(req.authUser) ? next() : res.status(403).json({error:'LaunchPad reviewer access required.'});
  const safe = handler => async (req,res) => { try { await handler(req,res); } catch(e) { console.error('LaunchPad:',e); res.status(500).json({error:'Unable to complete the LaunchPad request. Please try again.'}); } };
  const filters = (req,res) => { try { return buildFilters(req.query,entities); } catch(e) { res.status(400).json({error:e.message}); return null; } };
  router.post('/launchpad/submissions',requireAuth,safe(async(req,res) => {
    let answers; try { answers = validateSubmission(req.body?.answers); } catch(e) { return res.status(400).json({error:e.message}); }
    const [user] = await db('SELECT name, email, entity FROM users WHERE id = $1',[req.authUser.userId]);
    if (!user) return res.status(403).json({error:'Account unavailable.'});
    const [row] = await db(`WITH inserted AS (
      INSERT INTO launchpad_submissions (user_id,user_name,user_email,user_entity,answers) VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING *
    ), history AS (
      INSERT INTO launchpad_status_history (submission_id,status,changed_by,changed_by_name) SELECT id,status,user_id,user_name FROM inserted
    ) SELECT * FROM inserted`,[req.authUser.userId,user.name,user.email,user.entity,JSON.stringify(answers)]);
    res.status(201).json({submission:mapRow(row)});
  }));
  router.get('/launchpad/submissions/mine',requireAuth,safe(async(req,res) => {
    const rows = await db('SELECT * FROM launchpad_submissions WHERE user_id = $1 ORDER BY submitted_at DESC, id DESC',[req.authUser.userId]);
    res.json({submissions:rows.map(mapRow)});
  }));
  router.get('/launchpad/review',requireAuth,reviewer,safe(async(req,res) => {
    const f = filters(req,res); if (!f) return;
    const page = Number(req.query.page ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return res.status(400).json({error:'Invalid page.'});
    const rows = await db(`SELECT * FROM launchpad_submissions ${f.where} ORDER BY submitted_at DESC, id DESC LIMIT 25 OFFSET $${f.params.length+1}`,[...f.params,(page-1)*25]);
    // Aggregate every matching response, independently of pagination. Keep all
    // status card counts available while a single status is selected.
    const baseFilter = buildFilters({...req.query, status: ''}, entities);
    const counts = await db(`SELECT status, user_entity, COUNT(*)::integer AS count FROM launchpad_submissions ${baseFilter.where} GROUP BY status, user_entity`,baseFilter.params);
    const statusSummary = Object.fromEntries(Object.keys(STATUSES).map(s => [s,0]));
    const summary = {...statusSummary};
    const entityCounts = new Map();
    for (const c of counts) {
      statusSummary[c.status] += c.count;
      if (!req.query.status || c.status === req.query.status) {
        summary[c.status] += c.count;
        entityCounts.set(c.user_entity, (entityCounts.get(c.user_entity) ?? 0) + c.count);
      }
    }
    const entitySummary = [...entityCounts].map(([entity,count]) => ({entity,count})).sort((a,b) => b.count-a.count || String(a.entity).localeCompare(String(b.entity)));
    res.json({submissions:rows.map(mapRow),summary,statusSummary,entitySummary,total:Object.values(summary).reduce((a,b)=>a+b,0),page,pageSize:25});
  }));
  router.get('/launchpad/review/export',requireAuth,reviewer,safe(async(req,res) => {
    const f = filters(req,res); if (!f) return;
    const rows = await db(`SELECT * FROM launchpad_submissions ${f.where} ORDER BY submitted_at DESC, id DESC`,f.params);
    const headers = ['Reference','Submitted at (Africa/Lagos)','Status','Name','Email','Entity','Department','Line manager name','Line manager email','Problem and who it affects','Proposed change','Iwosan values','Where and with whom','Funding (NGN)','Pilot start','Pilot end','Success measurement','Risks','Pilot owner','Line manager supported','Last updated (Africa/Lagos)'];
    const stamp = d => new Date(d).toLocaleString('en-GB',{timeZone:'Africa/Lagos',hour12:false});
    const lines = [headers,...rows.map(r => { const a=r.answers; return [reference(r.id),stamp(r.submitted_at),STATUSES[r.status],r.user_name,r.user_email,entities[r.user_entity]??'Unassigned',a.department,a.managerName,a.managerEmail,a.problem,a.idea,a.values.join('; '),a.testPlan,a.funding,a.startDate,a.endDate,a.measurement,a.risks,a.owner,a.managerSupported?'Yes':'No',stamp(r.updated_at)]; })];
    res.setHeader('Content-Type','text/csv; charset=utf-8'); res.setHeader('Content-Disposition','attachment; filename="launchpad-responses.csv"');
    res.send('\uFEFF'+lines.map(line=>line.map(csvCell).join(',')).join('\r\n'));
  }));
  router.get('/launchpad/submissions/:id',requireAuth,safe(async(req,res) => {
    if (!/^\d+$/.test(req.params.id)) return res.status(404).json({error:'Submission not found.'});
    const [row] = await db('SELECT * FROM launchpad_submissions WHERE id = $1 AND (user_id = $2 OR $3::boolean)',[req.params.id,req.authUser.userId,canReviewLaunchpad(req.authUser)]);
    if (!row) return res.status(404).json({error:'Submission not found.'});
    const history = await db('SELECT status, changed_at AS "changedAt" FROM launchpad_status_history WHERE submission_id = $1 ORDER BY id',[row.id]);
    res.json({submission:mapRow(row),history});
  }));
  router.patch('/launchpad/submissions/:id/status',requireAuth,reviewer,safe(async(req,res) => {
    const {status,version} = req.body??{};
    if (!/^\d+$/.test(req.params.id) || !Object.hasOwn(STATUSES,status) || !Number.isInteger(version) || version<1) return res.status(400).json({error:'A valid submission, status and version are required.'});
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const {rows:[row]} = await client.query('SELECT * FROM launchpad_submissions WHERE id = $1 FOR UPDATE',[req.params.id]);
      if (!row || row.version!==version) { await client.query('ROLLBACK'); return res.status(row?409:404).json({error:row?'This submission changed. Refresh it before updating.':'Submission not found.'}); }
      if (row.status===status) { await client.query('COMMIT'); return res.json({submission:mapRow(row)}); }
      const {rows:[updated]} = await client.query('UPDATE launchpad_submissions SET status = $2, updated_at = NOW(), version = version + 1 WHERE id = $1 RETURNING *',[row.id,status]);
      await client.query('INSERT INTO launchpad_status_history (submission_id,status,changed_by,changed_by_name) SELECT $1,$2,id,name FROM users WHERE id = $3',[row.id,status,req.authUser.userId]);
      await client.query('COMMIT'); res.json({submission:mapRow(updated)});
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }));
}
