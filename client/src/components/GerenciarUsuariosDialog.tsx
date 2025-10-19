import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Mail } from "lucide-react";

interface GerenciarUsuariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GerenciarUsuariosDialog({
  open,
  onOpenChange,
}: GerenciarUsuariosDialogProps) {
  const { data: usuarios, isLoading } = trpc.usuarios.list.useQuery();

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "Administrador",
      user: "Usuário",
    };

    const roleColors: Record<string, string> = {
      admin: "bg-purple-100 text-purple-700 border-purple-200",
      user: "bg-blue-100 text-blue-700 border-blue-200",
    };

    return (
      <Badge variant="outline" className={roleColors[role] || ""}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Usuários</DialogTitle>
          <DialogDescription>
            Visualize todos os usuários cadastrados no sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          )}

          {!isLoading && usuarios && usuarios.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{usuarios.length} usuário(s) cadastrado(s)</p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {usuarios.map((usuario) => (
                  <div
                    key={usuario.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{usuario.name || "Sem nome"}</h3>
                        {usuario.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4" />
                            {usuario.email}
                          </div>
                        )}
                        {usuario.createdAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Cadastrado em: {new Date(usuario.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {getRoleBadge(usuario.role)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && usuarios && usuarios.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

