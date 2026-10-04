# Usuários por empresa no /admin

O frontend MarthiProject consulta `GET /api/v1/admin/company-users` no Nest,
exibindo a tabela no dashboard `/admin` e em `/admin/clientes`, com os estilos
existentes. Consulta inicial, botão Atualizar, retorno à janela e atualização
a cada minuto consultam o banco novamente. Erros aparecem como erros, nunca zero.

## Modelo e regra

Schema Prisma e migrations `20260919000000_init_contract` e
`20260922000000_fase3_p0_registry_pos_queue` foram inspecionados.
`Store` corresponde a `stores`; `Employee` a `employees`; `User` a `users`.
O cadastro de conta `User` não possui status ativo/inativo. `lastLoginAt`
significa último login, não atividade cadastral.

Contamos **logins cadastrados em Employee com isSystemUser=true**, e não todas
as contas User nem funcionários de RH. Identidade: `storeId` e e-mail
normalizado (trim/lowercase), preferindo `userEmail`, com fallback para `email`.
Cada login conta uma vez por empresa. Se houver qualquer cadastro ativo para o
login, conta como ativo; se todos forem inativos, conta como inativo.
A prioridade de cadastro ativo acompanha a busca existente em RegistryService.getAccess.
O total é sempre ativos + inativos. Empresas sem cadastros têm zero.

`duplicateLogins` conta logins com mais de um cadastro. `conflictingStatuses`
conta logins duplicados com situações diferentes. `missingEmail` conta
cadastros sem e-mail (excluídos do total). `withoutAccount` conta logins sem
conta User de mesmo e-mail e MESMA empresa, inclusive cadastros inativos.
Esses cadastros continuam no total cadastral e são claramente sinalizados.
Nenhum cadastro inconsistente é corrigido automaticamente.

O DELETE de Employee existente é uma desativação: o login passa a inativo
quando não houver outro cadastro ativo. Mudanças de isSystemUser, exclusão
física e criação são refletidas na consulta seguinte. Cada consulta usa uma
transação somente de leitura com isolamento RepeatableRead para combinar
dados do mesmo instante. Não são gravados contadores ou tabelas adicionais.
Não há migration nem acesso a dados de produção nesta implementação.

## Autorização e ativação

O guard JWT global existente autentica e carrega a conta do banco. O serviço
exige que o e-mail autenticado corresponda a `AUTH_MARTHI_EMAIL` configurado
no servidor. Sem configuração, acesso é negado. Administrador de loja não
ganha acesso global. A resposta não contém e-mails ou outros dados de usuários.
Agrupamento e vínculo de contas sempre incluem o ID da empresa.

Configurar AUTH_MARTHI_EMAIL no backend com o e-mail de uma conta staff
EXISTENTE e usar login real Google/senha que emita JWT Nest. Manter o e-mail
alinhado à configuração de staff da UI. A sessão local/demo existente não
autoriza a API; a UI informa essa condição sem gerar números fictícios.
Esta alteração não cria contas, redefine senhas ou modifica .env real.

Clientes locais antigos da tela não possuem vínculo confiável com Store.id.
Por isso a tabela de contagens usa os IDs reais e permanece separada dos
controles locais de cobrança/clientes. Migrar estes controles locais para o
banco é um trabalho distinto.

## Testes

Executar `npm run test:admin` no Marthi-Backend. Os testes nativos Node compilam
o código real em memória, validam cálculo e serviço com repositório simulado.
Cobrem ativos/inativos, empresa vazia, funcionários sem acesso, isolamento,
normalização, duplicidades, conflitos, conta ausente, criação, desativação,
reativação, remoção, autorização staff e falha do banco.

Não substituem teste de integração com PostgreSQL e sessão staff real.
