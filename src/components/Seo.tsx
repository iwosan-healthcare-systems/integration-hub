import { Helmet } from "react-helmet-async";

const SITE_URL = "https://iwosaninnovationhub.com";
const SITE_NAME = "Iwosan Integration Hub";
const DEFAULT_IMAGE = `${SITE_URL}/iwosan_icon.png`;

interface SeoProps {
  title: string;
  description: string;
  path: string;
  image?: string;
}

/** Per-page title/description/canonical/OG tags, overriding the defaults in index.html. */
export function Seo({ title, description, path, image = DEFAULT_IMAGE }: SeoProps) {
  const url = `${SITE_URL}${path}`;
  const fullTitle = title === SITE_NAME ? title : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />

      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
}
