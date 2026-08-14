import BuildStatus from "../components/BuildStatus";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Hammer } from "lucide-react";
import { useUI } from "../context/UIContext";

export default function Build() {
  const { t } = useUI();
  return (
    <div className="p-6 md:p-8 w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="w-6 h-6 text-primary" /> {t("build.title")}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("build.subtitle")}
        </p>
      </div>
      <BuildStatus onTriggered={() => {}} />
      <Card>
        <CardHeader><CardTitle className="text-base">{t("build.about")}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("build.aboutText")}</p>
          <ul className="list-disc list-inside space-y-1">
            <li>{t("build.aboutIcons")}</li>
            <li>{t("build.aboutBoxarts")}</li>
            <li>{t("build.aboutPages")}</li>
            <li>{t("build.aboutForwarders")}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
