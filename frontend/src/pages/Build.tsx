import BuildStatus from "../components/BuildStatus";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Hammer } from "lucide-react";

export default function Build() {
  return (
    <div className="p-6 md:p-8 w-full max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hammer className="w-6 h-6 text-primary" /> Build
        </h1>
        <p className="text-muted-foreground text-sm">
          Lancez un build du site et suivez sa progression en temps réel.
        </p>
      </div>
      <BuildStatus onTriggered={() => {}} />
      <Card>
        <CardHeader><CardTitle className="text-base">À propos du build</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Le build régénère automatiquement :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Les icônes extraites des ROMs</li>
            <li>Les boxarts et screenshots (libretro)</li>
            <li>Les pages du site + games.json</li>
            <li>Les forwarders .cia (skippés si déjà générés)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}