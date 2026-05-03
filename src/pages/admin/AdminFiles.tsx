import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { adminGetFiles } from "@/lib/adminApi";
import type { AdminDocument } from "@/lib/adminApi";
import { ChevronDown, ChevronRight, FileText, Loader2 } from "lucide-react";

const AdminFiles = () => {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    adminGetFiles()
      .then(setDocuments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive py-8">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold mb-2">Uploaded Files & Chunks</h1>
        <p className="text-muted-foreground mb-8">All documents and their chunks across users</p>
      </motion.div>

      {documents.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No documents uploaded yet.
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.28 }}
            >
            <Collapsible
              open={openId === doc.id}
              onOpenChange={(o) => setOpenId(o ? doc.id : null)}
            >
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div className="text-left">
                          <CardTitle className="text-base">{doc.file_name}</CardTitle>
                          <CardDescription>
                            {doc.user_email} • {doc.chunks_count} chunks • {doc.file_type}
                          </CardDescription>
                        </div>
                      </div>
                      {openId === doc.id ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 border-t">
                    <p className="text-sm font-medium mb-3">Chunks preview:</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {doc.chunks.map((chunk) => (
                        <div
                          key={chunk.id}
                          className="p-3 rounded-lg bg-muted/50 text-sm font-mono"
                        >
                          <span className="text-muted-foreground">#{chunk.index}</span>{" "}
                          {chunk.text}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default AdminFiles;
