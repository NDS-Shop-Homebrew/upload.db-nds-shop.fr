import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { UploadCloud } from "lucide-react";

interface FileItem {
  id: string;
  display: string;
}

interface FileUploaderProps {
  label: string;
  accept: string;
  type: "icon" | "screenshot" | "nds" | "cia";
  multiple?: boolean;
  uploading: boolean;
  items: FileItem[];
  onUpload: (
    type: "icon" | "screenshot" | "nds" | "cia",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  onRemove?: (type: "screenshot" | "nds", identifier: string) => void;
}

export function FileUploader({
  label,
  accept,
  type,
  multiple = false,
  uploading,
  items,
  onUpload,
  onRemove,
}: FileUploaderProps) {
  return (
    <div className="p-4 border rounded-md bg-muted/50">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="mt-2 flex items-center gap-4">
        <Label className="cursor-pointer flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
          <UploadCloud size={18} />
          <span>{uploading ? "Envoi..." : "Parcourir"}</span>
          <Input
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            disabled={uploading}
            onChange={(e) => onUpload(type, e)}
          />
        </Label>
      </div>

      {items.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 px-3 py-1 bg-background border rounded-full text-sm"
            >
              <span className="truncate max-w-[200px]" title={item.display}>
                {item.display}
              </span>
              {onRemove && (type === "screenshot" || type === "nds") && (
                <button
                  type="button"
                  onClick={() => onRemove(type, item.id)}
                  className="text-destructive hover:text-destructive/80 ml-1 font-bold"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
