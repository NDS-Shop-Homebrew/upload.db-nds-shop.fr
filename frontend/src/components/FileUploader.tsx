import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { UploadCloud } from "lucide-react";
import SafeImg from "./SafeImg";

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

const isImage = (type: "icon" | "screenshot" | "nds" | "cia") =>
  type === "icon" || type === "screenshot";

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
              className={`flex items-center gap-2 bg-background border rounded-lg ${
                isImage(type) ? "px-2 py-1.5" : "px-3 py-1 rounded-full text-sm"
              }`}
            >
              {isImage(type) && (
                <SafeImg
                  src={item.id}
                  alt={item.display}
                  className="w-10 h-10 rounded object-cover ring-1 ring-border shrink-0"
                  wrapperClassName="w-10 h-10 rounded bg-muted shrink-0"
                />
              )}
              <span className="truncate max-w-[180px]" title={item.display}>
                {item.display}
              </span>
              {onRemove && (type === "screenshot" || type === "nds") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onRemove(type, item.id)}
                  className="ml-1 rounded-full text-destructive hover:text-destructive/80 hover:bg-transparent font-bold"
                >
                  &times;
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
