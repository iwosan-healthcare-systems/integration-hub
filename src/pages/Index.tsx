import { HubLayout } from "@/layouts/HubLayout";
import { HeroSection } from "@/components/HeroSection";
import { QuickLinksGrid } from "@/components/QuickLinksGrid";
import { SubsidiariesPreview } from "@/components/SubsidiariesPreview";
import { NewsPreview } from "@/components/NewsPreview";

const Index = () => {
  return (
    <HubLayout>
      <HeroSection />
      <QuickLinksGrid />
      <SubsidiariesPreview />
      <NewsPreview />
    </HubLayout>
  );
};

export default Index;
