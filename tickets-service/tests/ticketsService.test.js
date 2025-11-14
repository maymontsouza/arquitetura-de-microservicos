import { TicketsService } from "../services/ticketsService.js";

describe("TicketsService", () => {
  describe("validateNewTicket", () => {
    it("não deve lançar erro quando todos os campos obrigatórios forem informados", () => {
      const inputValido = {
        titulo: "Erro ao logar no sistema",
        descricao: "Usuário não consegue autenticar com credenciais válidas",
        setor_destino_id: 1,
        solicitante_id: 42
      };

      expect(() => TicketsService.validateNewTicket(inputValido)).not.toThrow();
    });

    it("deve lançar erro quando faltar algum campo obrigatório", () => {
      const inputInvalido = {
        titulo: "Chamado sem setor",
        descricao: "Faltando setor_destino_id",
        setor_destino_id: null,
        solicitante_id: 42,
      };

      try {
        TicketsService.validateNewTicket(inputInvalido);
        throw new Error("Era esperado que lançasse erro");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("campos obrigatórios faltando");
        expect(err.status).toBe(400);
      }
    });
  });

  describe("validateStatus", () => {
    it("não deve lançar erro para status válidos", () => {
      for (const status of TicketsService.allowedStatuses) {
        expect(() => TicketsService.validateStatus(status)).not.toThrow();
      }
    });

    it("deve lançar erro para status inválido", () => {
      const statusInvalido = "Cancelado";

      try {
        TicketsService.validateStatus(statusInvalido);
        throw new Error("Era esperado que lançasse erro");
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("status inválido");
        expect(err.status).toBe(400);
        expect(err.allowed).toEqual(TicketsService.allowedStatuses);
      }
    });
  });

  describe("allowedStatuses", () => {
    it("deve expor a lista completa de status permitidos", () => {
      expect(TicketsService.allowedStatuses).toEqual([
        "Aberto",
        "Em Andamento",
        "Aguardando Resposta",
        "Resolvido",
        "Fechado",
      ]);
    });
  });
});
