import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Search, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

interface PesquisarPeriodicoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PesquisarPeriodicoDialog({
  open,
  onOpenChange,
}: PesquisarPeriodicoDialogProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: resultados, isLoading } = trpc.periodicos.search.useQuery(searchQuery, {
    enabled: searchQuery.length > 0,
  });

  const handlePeriodicoClick = (id: string) => {
    onOpenChange(false);
    setLocation(`/periodicos/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pesquisar Periódico</DialogTitle>
          <DialogDescription>
            Busque periódicos por nome, ISSN ou área de conhecimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Digite o nome, ISSN ou área..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          )}

          {!isLoading && searchQuery && resultados && resultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {resultados.length} periódico(s) encontrado(s)
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {resultados.map((periodico) => (
                  <button
                    key={periodico.id}
                    onClick={() => handlePeriodicoClick(periodico.id)}
                    className="w-full p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{periodico.nome}</h3>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                          {periodico.issn && <span>ISSN: {periodico.issn}</span>}
                          {periodico.area && <span>{periodico.area}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {periodico.qualis && <Badge variant="secondary">{periodico.qualis}</Badge>}
                      </div>
                    </div>
                    {periodico.descricao && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {periodico.descricao}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isLoading && searchQuery && resultados && resultados.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum periódico encontrado</p>
              <p className="text-sm text-gray-400 mt-2">
                Tente buscar por outro termo ou cadastre um novo periódico
              </p>
            </div>
          )}

          {!searchQuery && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Digite algo para começar a busca</p>
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

