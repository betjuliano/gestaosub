CREATE TABLE `autores` (
	`id` varchar(64) NOT NULL,
	`nome` varchar(300) NOT NULL,
	`email` varchar(320),
	`instituicao` varchar(500),
	`submissaoId` varchar(64) NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `autores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historico_status` (
	`id` varchar(64) NOT NULL,
	`status` enum('EM_AVALIACAO','APROVADO','REJEITADO','REVISAO_SOLICITADA','SUBMETIDO_NOVAMENTE') NOT NULL,
	`data` timestamp NOT NULL DEFAULT (now()),
	`submissaoId` varchar(64) NOT NULL,
	`observacao` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `historico_status_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `periodicos` (
	`id` varchar(64) NOT NULL,
	`nome` varchar(500) NOT NULL,
	`issn` varchar(20),
	`area` varchar(200),
	`qualis` varchar(10),
	`descricao` text,
	`abdc` varchar(10),
	`abs` varchar(10),
	`sjrQuartile` varchar(10),
	`sjrScore` varchar(20),
	`jcrQuartile` varchar(10),
	`jcrImpactFactor` varchar(20),
	`publisher` varchar(300),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `periodicos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `periodicos_alternativos` (
	`id` varchar(64) NOT NULL,
	`submissaoId` varchar(64) NOT NULL,
	`periodicoNome` varchar(500) NOT NULL,
	`periodicoISSN` varchar(20),
	`periodicoArea` varchar(200),
	`prioridade` int NOT NULL,
	`motivo` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `periodicos_alternativos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `revisoes` (
	`id` varchar(64) NOT NULL,
	`dataRecebimento` timestamp NOT NULL,
	`numeroRevisores` int NOT NULL,
	`comentarios` text NOT NULL,
	`submissaoId` varchar(64) NOT NULL,
	`revisorId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `revisoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissoes` (
	`id` varchar(64) NOT NULL,
	`titulo` varchar(1000) NOT NULL,
	`resumo` text NOT NULL,
	`palavrasChave` text NOT NULL,
	`dataSubmissao` timestamp NOT NULL DEFAULT (now()),
	`status` enum('EM_AVALIACAO','APROVADO','REJEITADO','REVISAO_SOLICITADA','SUBMETIDO_NOVAMENTE') NOT NULL DEFAULT 'EM_AVALIACAO',
	`planoAcao` text,
	`criadorId` varchar(64) NOT NULL,
	`periodicoId` varchar(64) NOT NULL,
	`submissaoOriginalId` varchar(64),
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `submissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `submissao_idx` ON `autores` (`submissaoId`);--> statement-breakpoint
CREATE INDEX `submissao_idx` ON `historico_status` (`submissaoId`);--> statement-breakpoint
CREATE INDEX `data_idx` ON `historico_status` (`data`);--> statement-breakpoint
CREATE INDEX `nome_idx` ON `periodicos` (`nome`);--> statement-breakpoint
CREATE INDEX `issn_idx` ON `periodicos` (`issn`);--> statement-breakpoint
CREATE INDEX `area_idx` ON `periodicos` (`area`);--> statement-breakpoint
CREATE INDEX `submissao_idx` ON `periodicos_alternativos` (`submissaoId`);--> statement-breakpoint
CREATE INDEX `prioridade_idx` ON `periodicos_alternativos` (`prioridade`);--> statement-breakpoint
CREATE INDEX `submissao_idx` ON `revisoes` (`submissaoId`);--> statement-breakpoint
CREATE INDEX `revisor_idx` ON `revisoes` (`revisorId`);--> statement-breakpoint
CREATE INDEX `criador_idx` ON `submissoes` (`criadorId`);--> statement-breakpoint
CREATE INDEX `periodico_idx` ON `submissoes` (`periodicoId`);--> statement-breakpoint
CREATE INDEX `status_idx` ON `submissoes` (`status`);--> statement-breakpoint
CREATE INDEX `data_idx` ON `submissoes` (`dataSubmissao`);--> statement-breakpoint
CREATE INDEX `email_idx` ON `users` (`email`);