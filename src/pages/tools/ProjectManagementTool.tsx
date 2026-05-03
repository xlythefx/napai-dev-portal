import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, FolderKanban, ListTodo } from "lucide-react";
import { motion } from "framer-motion";

const ProjectManagementTool = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <section className="pt-28 pb-24 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link
          to="/tools"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
            <FolderKanban className="w-16 h-16 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Project Management Tool</h1>
          <p className="text-muted-foreground mb-8">
            Plan, track, and collaborate on projects with tasks and milestones. Coming soon.
          </p>
          <Card className="border-2 border-dashed">
            <CardContent className="pt-6">
              <ListTodo className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">This tool is under development</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
    <Footer />
  </div>
);

export default ProjectManagementTool;
