import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type Project,
} from "@/lib/timeTrackerApi";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderKanban, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PRESET_COLORS = [
  "#5b8def", "#3ecf8e", "#e05555", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
];

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.28 },
  }),
};

interface ProjectForm {
  name: string;
  description: string;
  color: string;
}

const emptyForm = (): ProjectForm => ({ name: "", description: "", color: "#5b8def" });

const AdminProjects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requesterEmail = user?.email ?? "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<ProjectForm>(emptyForm());
  const [addSaving, setAddSaving] = useState(false);

  // edit dialog
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<ProjectForm>(emptyForm());
  const [editSaving, setEditSaving] = useState(false);

  // delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const fetchProjects = () => {
    setLoading(true);
    setError(null);
    listProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProjects(); }, []);

  const openEdit = (p: Project) => {
    setEditProject(p);
    setEditForm({ name: p.name, description: p.description ?? "", color: p.color });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      toast({ title: "Project name required", variant: "destructive" });
      return;
    }
    setAddSaving(true);
    try {
      const project = await createProject({
        requester_email: requesterEmail,
        name: addForm.name.trim(),
        description: addForm.description.trim() || undefined,
        color: addForm.color,
      });
      setProjects((prev) => [...prev, project]);
      setAddForm(emptyForm());
      setAddOpen(false);
      toast({ title: "Project created" });
    } catch (e) {
      toast({
        title: "Failed to create project",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setAddSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject) return;
    if (!editForm.name.trim()) {
      toast({ title: "Project name required", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      await updateProject({
        requester_email: requesterEmail,
        id: editProject.id,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        color: editForm.color,
      });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editProject.id
            ? { ...p, name: editForm.name.trim(), description: editForm.description.trim() || null, color: editForm.color }
            : p
        )
      );
      setEditProject(null);
      toast({ title: "Project updated" });
    } catch (e) {
      toast({
        title: "Failed to update",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleteSaving(true);
    try {
      await deleteProject({ requester_email: requesterEmail, id: deleteId });
      setProjects((prev) => prev.filter((p) => p.id !== deleteId));
      setDeleteId(null);
      toast({ title: "Project removed" });
    } catch (e) {
      toast({
        title: "Failed to remove",
        description: e instanceof Error ? e.message : "Try again",
        variant: "destructive",
      });
    } finally {
      setDeleteSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-start justify-between mb-8">
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-3xl font-bold mb-2">Projects</h1>
          <p className="text-muted-foreground">
            Manage projects that developers select when starting a time tracking session.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
          <Button onClick={() => { setAddForm(emptyForm()); setAddOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Button>
        </motion.div>
      </div>

      {error && (
        <div className="text-destructive py-4 px-4 rounded-lg bg-destructive/10 mb-6">
          <p className="font-medium">{error}</p>
          <Button variant="outline" className="mt-3" onClick={fetchProjects}>Retry</Button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5" />
              {projects.length} Project{projects.length !== 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              These appear in the desktop time tracker dropdown.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FolderKanban className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No projects yet.</p>
                <p className="text-sm mt-1">Add a project so developers can track time against it.</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => { setAddForm(emptyForm()); setAddOpen(true); }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project, i) => (
                  <motion.div
                    key={project.id}
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: project.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{project.name}</p>
                      {project.description && (
                        <p className="text-sm text-muted-foreground truncate">{project.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(project)}>
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(project.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Project</DialogTitle>
            <DialogDescription>
              Create a project for developers to track time against.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project name</label>
              <Input
                placeholder="e.g. NAP Platform"
                value={addForm.name}
                onChange={(e) => setAddForm((s) => ({ ...s, name: e.target.value }))}
                required
                autoFocus
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Short description shown in the app"
                value={addForm.description}
                onChange={(e) => setAddForm((s) => ({ ...s, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-2 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAddForm((s) => ({ ...s, color: c }))}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      background: c,
                      ring: addForm.color === c ? `3px solid ${c}` : undefined,
                      outline: addForm.color === c ? `2px solid white` : "none",
                      outlineOffset: addForm.color === c ? "2px" : undefined,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={addForm.color}
                  onChange={(e) => setAddForm((s) => ({ ...s, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border border-border cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>{editProject?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                required
                autoFocus
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <Input
                placeholder="Short description"
                value={editForm.description}
                onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="flex items-center gap-2 mt-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditForm((s) => ({ ...s, color: c }))}
                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    style={{
                      background: c,
                      outline: editForm.color === c ? `2px solid white` : "none",
                      outlineOffset: editForm.color === c ? "2px" : undefined,
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm((s) => ({ ...s, color: e.target.value }))}
                  className="w-7 h-7 rounded-full border border-border cursor-pointer"
                  title="Custom color"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditProject(null)} disabled={editSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove project?</DialogTitle>
            <DialogDescription>
              {(() => {
                const p = projects.find((x) => x.id === deleteId);
                return p
                  ? `"${p.name}" will be deactivated. Existing sessions that used this project are not affected.`
                  : "This project will be deactivated.";
              })()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleteSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteSaving}>
              {deleteSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default AdminProjects;
