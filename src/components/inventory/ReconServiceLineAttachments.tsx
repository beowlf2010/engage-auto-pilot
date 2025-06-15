
import React, { useRef, useState } from "react";
import { fetchReconAttachments, addReconAttachment } from "@/services/inventory/reconService";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Image, Camera } from "lucide-react";

interface Props {
  serviceLineId: string;
  currentUser: any;
}

const ReconServiceLineAttachments: React.FC<Props> = ({ serviceLineId, currentUser }) => {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !currentUser) return;
    setLoading(true);
    try {
      // For demo: just use URL.createObjectURL. In real use, upload to Supabase Storage!
      const uploads: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = URL.createObjectURL(files[i]);
        await addReconAttachment(serviceLineId, url, currentUser.id);
        uploads.push({ url });
      }
      setAttachments(a => [...a, ...uploads]);
      toast({ title: "Attachment uploaded!" });
    } catch {
      toast({ title: "Attach failed", variant: "destructive" });
    }
    setLoading(false);
  };

  React.useEffect(() => {
    fetchReconAttachments(serviceLineId).then(setAttachments);
  }, [serviceLineId]);

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-2 items-center">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          capture="environment"
        />
        <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={loading}>
          <Camera className="w-4 h-4 mr-1" />
          Add Photo
        </Button>
        <span className="text-xs text-gray-500">{attachments.length} photo(s)</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {attachments.map((a, i) => (
          <img
            key={i}
            src={a.url}
            alt={`Attachment ${i + 1}`}
            className="rounded w-full aspect-square object-cover border"
          />
        ))}
      </div>
    </div>
  );
};

export default ReconServiceLineAttachments;
