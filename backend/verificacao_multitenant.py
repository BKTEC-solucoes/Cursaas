"""
Smoke test de isolamento multi-tenant e autorizacao.

O projeto nao tem suite de testes; este script exercita, contra um servidor
rodando, as correcoes de seguranca aplicadas nas rotas.

Pre-requisitos:
    1. backend/seed_ambiente_teste.py --confirmar --banco cursaas
    2. uvicorn app.main:app --port 8000

Uso (a partir de backend/, para que `import app` resolva):
    venv/Scripts/python.exe verificacao_multitenant.py

Cria e remove um usuario 'orfao@cursaas.dev' durante a execucao.
"""
import json
import time
import urllib.error
import urllib.request

BASE = "http://localhost:8000/api"
SENHA = "Teste@123"
# Sufixo por execucao: nome de curso e unico por tenant, entao rodar duas vezes
# sem re-semear colidiria.
SUF = str(int(time.time()))

ok = fail = 0


def req(metodo, caminho, token=None, corpo=None):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    r = urllib.request.Request(BASE + caminho, data=dados, method=metodo)
    if token:
        r.add_header("Authorization", "Bearer " + token)
    if dados:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r) as resp:
            corpo_txt = resp.read().decode()
            return resp.status, (json.loads(corpo_txt) if corpo_txt else None)
    except urllib.error.HTTPError as e:
        corpo_txt = e.read().decode()
        try:
            return e.code, json.loads(corpo_txt)
        except Exception:
            return e.code, corpo_txt


def login(email):
    st, body = req("POST", "/auth/login", corpo={"email": email, "senha": SENHA})
    assert st == 200, (email, st, body)
    return body["access_token"]


def check(nome, condicao, detalhe=""):
    global ok, fail
    if condicao:
        ok += 1
        print("  PASS  " + nome)
    else:
        fail += 1
        print("  FAIL  " + nome + ("  -> " + str(detalhe) if detalhe else ""))


# Nenhum schema de curso expoe faculdade_id, entao o mapa tenant->curso vem do
# banco e comparamos por id.
from sqlalchemy import text  # noqa: E402
from app.database import engine  # noqa: E402


def cursos_do_tenant(fid):
    with engine.connect() as c:
        return {r[0] for r in c.execute(
            text("SELECT id FROM cursos WHERE faculdade_id = :f"), {"f": fid})}


def tenant_do_curso(curso_id):
    with engine.connect() as c:
        return c.execute(
            text("SELECT faculdade_id FROM cursos WHERE id = :i"), {"i": curso_id}).scalar()


print("== login ==")
t_super = login("super@cursaas.dev")
t_alfa = login("instrutor.alfa@cursaas.dev")
t_beta = login("instrutor.beta@cursaas.dev")
t_admin_alfa = login("admin.alfa@cursaas.dev")
t_aluno_alfa = login("aluno.alfa@cursaas.dev")
t_pendente = login("aluno.pendente@cursaas.dev")
print("  6 tokens obtidos")

print()
print("== #2 TenantContext: conta sem vinculo nao e super admin ==")
st, body = req("GET", "/cursos/", token=t_pendente)
check("aluno sem vinculo ve 0 cursos", st == 200 and body == [], (st, body))

st, body = req("GET", "/cursos/", token=t_aluno_alfa)
vistos = {c["id"] for c in body} if st == 200 else set()
check("aluno Alfa ve so cursos do tenant 1",
      st == 200 and vistos and vistos <= cursos_do_tenant(1),
      (st, vistos, "tenant1=", cursos_do_tenant(1)))

print()
print("== #5 isolamento de tenant nas rotas admin ==")
st, admins_alfa = req("GET", "/auth/admins", token=t_admin_alfa)
emails = [a["email"] for a in admins_alfa["items"]] if st == 200 else []
check("listar_admins nao vaza admin de outro tenant",
      st == 200 and "instrutor.beta@cursaas.dev" not in emails, (st, emails))

st, body = req("GET", "/auth/admins", token=t_alfa)
check("instrutor NAO lista administradores (403)", st == 403, (st, body))

st, cursos_alfa = req("GET", "/admin/cursos", token=t_alfa)
ids_alfa = {c["id"] for c in cursos_alfa} if st == 200 else set()
check("/admin/cursos filtra por tenant",
      st == 200 and ids_alfa <= cursos_do_tenant(1),
      (st, ids_alfa, "tenant1=", cursos_do_tenant(1)))

st, cursos_super = req("GET", "/admin/cursos", token=t_super)
ids_super = {c["id"] for c in cursos_super} if st == 200 else set()
check("super admin ve cursos dos 2 tenants",
      st == 200 and ids_super & cursos_do_tenant(1) and ids_super & cursos_do_tenant(2),
      (st, ids_super))

print()
print("== #9 curso pago entra na fila de aprovacao ==")
st, curso_pago = req("POST", "/cursos/", token=t_alfa,
                     corpo={"nome": "Curso Pago " + SUF, "descricao": "x",
                            "pago": True, "valor": 100.0})
check("curso pago nasce 'pendente'",
      st == 201 and curso_pago.get("status") == "pendente", (st, curso_pago))
curso_pago_id = curso_pago.get("id") if st == 201 else None

st, curso_free = req("POST", "/cursos/", token=t_alfa,
                     corpo={"nome": "Curso Gratis " + SUF, "pago": False})
check("curso gratuito nasce 'aprovado'",
      st == 201 and curso_free.get("status") == "aprovado", (st, curso_free))

st, fila = req("GET", "/admin/solicitacoes", token=t_alfa)
check("curso pago aparece na fila do proprio tenant",
      st == 200 and any(c["id"] == curso_pago_id for c in fila), (st, fila))

st, fila_beta = req("GET", "/admin/solicitacoes", token=t_beta)
check("fila do tenant Beta nao mostra curso do Alfa",
      st == 200 and not any(c["id"] == curso_pago_id for c in fila_beta), (st, fila_beta))

print()
print("== #4 tc.stamp: curso criado recebe o tenant ==")
check("curso criado por instrutor Alfa tem faculdade_id=1",
      curso_pago_id is not None and tenant_do_curso(curso_pago_id) == 1,
      tenant_do_curso(curso_pago_id) if curso_pago_id else curso_pago)

st, body = req("POST", "/cursos/", token=t_super, corpo={"nome": "Sem Tenant " + SUF, "pago": False})
check("super admin sem faculdade_id recebe 400",
      st == 400, (st, body))

print()
print("== #5 aprovacao cruzada entre tenants ==")
if curso_pago_id:
    st, body = req("POST", f"/admin/solicitacoes/{curso_pago_id}/aprovar", token=t_beta)
    check("instrutor Beta NAO aprova curso do Alfa (403)", st == 403, (st, body))

    st, body = req("POST", f"/admin/solicitacoes/{curso_pago_id}/aprovar", token=t_alfa)
    check("instrutor Alfa aprova o proprio curso",
          st == 200 and body.get("status") == "aprovado", (st, body))

print()
print("== #6 _guard_tenant exige papel de gestor ==")
st, body = req("GET", "/faculdades/1/alunos", token=t_aluno_alfa)
check("aluno NAO lista alunos da faculdade (403)", st == 403, (st, body))

st, body = req("DELETE", "/faculdades/1/alunos/7", token=t_aluno_alfa)
check("aluno NAO desvincula colega (403)", st == 403, (st, body))

st, body = req("GET", "/faculdades/1/alunos", token=t_alfa)
check("instrutor do tenant lista alunos (200)", st == 200, (st, body))

print()
print("== #7 escalonamento via editar_admin ==")
st, eu = req("GET", "/auth/admins", token=t_admin_alfa)
itens_alfa = eu["items"] if st == 200 else []
id_instrutor_alfa = next((a["id"] for a in itens_alfa
                          if a["email"] == "instrutor.alfa@cursaas.dev"), None)
id_admin_alfa = next((a["id"] for a in itens_alfa
                      if a["email"] == "admin.alfa@cursaas.dev"), None)

st, body = req("PUT", f"/auth/admins/{id_instrutor_alfa}", token=t_alfa,
               corpo={"admin_role": "super_admin"})
check("instrutor NAO edita administrador (403)", st == 403, (st, body))

st, body = req("PUT", f"/auth/admins/{id_instrutor_alfa}", token=t_admin_alfa,
               corpo={"admin_role": "super_admin"})
check("admin da faculdade NAO promove a super_admin (403)", st == 403, (st, body))

st, body = req("PUT", f"/auth/admins/{id_admin_alfa}", token=t_admin_alfa,
               corpo={"admin_role": "instrutor"})
check("admin da faculdade NAO altera o proprio perfil (403)", st == 403, (st, body))

st, body = req("PUT", f"/auth/admins/{id_instrutor_alfa}", token=t_admin_alfa,
               corpo={"admin_role": "admin_faculdade"})
check("admin da faculdade promove instrutor a admin_faculdade (200)", st == 200, (st, body))
# Devolve o instrutor ao cargo original: o script pode rodar mais de uma vez
# contra o mesmo banco.
req("PUT", f"/auth/admins/{id_instrutor_alfa}", token=t_admin_alfa,
    corpo={"admin_role": "instrutor"})

st, admins_todos = req("GET", "/auth/admins", token=t_super)
id_beta = next((a["id"] for a in admins_todos["items"]
                if a["email"] == "instrutor.beta@cursaas.dev"), None)
st, body = req("PUT", f"/auth/admins/{id_beta}", token=t_admin_alfa, corpo={"nome": "Invadido"})
check("admin do Alfa NAO edita admin do Beta (403)", st == 403, (st, body))

id_super = next((a["id"] for a in admins_todos["items"]
                 if a["email"] == "super@cursaas.dev"), None)
st, body = req("PUT", f"/auth/admins/{id_super}", token=t_super,
               corpo={"admin_role": "instrutor"})
check("super admin NAO altera o proprio perfil (403)", st == 403, (st, body))

st, body = req("PUT", f"/auth/admins/{id_beta}", token=t_super, corpo={"nome": "Beta Renomeado"})
check("super admin edita admin de qualquer tenant (200)", st == 200, (st, body))

print()
print("== marketplace publico por faculdade (/f/{slug}) ==")
# Endpoint publico e sem sessao: o tenant vem do slug na URL. O escopo e
# obrigatorio -- antes, sem slug, devolvia os cursos de TODAS as faculdades
# para qualquer visitante anonimo.
st, body = req("GET", "/cursos/catalogo")
check("catalogo anonimo SEM slug -> 400 (nao vaza todos os tenants)",
      st == 400, (st, body))

st, body = req("GET", "/cursos/catalogo?faculdade=nao-existe")
check("catalogo com slug inexistente -> 404", st == 404, (st, body))

st, cat_alfa = req("GET", "/cursos/catalogo?faculdade=alfa")
ids_cat_alfa = {c["id"] for c in cat_alfa} if st == 200 else set()
check("catalogo publico da Alfa traz so cursos da Alfa",
      st == 200 and ids_cat_alfa and ids_cat_alfa <= cursos_do_tenant(1),
      (st, ids_cat_alfa))

st, cat_beta = req("GET", "/cursos/catalogo?faculdade=beta")
ids_cat_beta = {c["id"] for c in cat_beta} if st == 200 else set()
check("catalogo publico da Beta traz so cursos da Beta",
      st == 200 and ids_cat_beta and ids_cat_beta <= cursos_do_tenant(2),
      (st, ids_cat_beta))

check("os dois marketplaces nao compartilham curso",
      not (ids_cat_alfa & ids_cat_beta), (ids_cat_alfa, ids_cat_beta))

st, body = req("GET", "/faculdades/publica/tema/alfa")
st2, body2 = req("GET", "/faculdades/publica/tema/beta")
check("tema publico por slug difere entre tenants",
      st == 200 and st2 == 200 and body["primary_color"] != body2["primary_color"],
      (body.get("primary_color") if st == 200 else st,
       body2.get("primary_color") if st2 == 200 else st2))

print()
print("== #3 rotas antes sem autenticacao ==")
st, body = req("GET", "/alunos/6/cursos")
check("GET /alunos/{id}/cursos sem token -> 401", st == 401, (st, body))

st, body = req("GET", "/alunos/7/cursos", token=t_aluno_alfa)
check("aluno NAO le cursos de outro aluno (403)", st == 403, (st, body))

st, body = req("DELETE", "/aulas/1/video/1")
check("DELETE video sem token -> 401", st == 401, (st, body))

st, body = req("GET", "/aulas/video/qualquer.mp4")
check("GET video sem token -> 401", st == 401, (st, body))

st, body = req("GET", "/aulas/video/../../app/config.py", token=t_alfa)
check("path traversal no nome do arquivo -> 404", st == 404, (st, body))

print()
print("== uploads estatico ==")
try:
    with urllib.request.urlopen("http://localhost:8000/uploads/videos/x.mp4") as r:
        st = r.status
except urllib.error.HTTPError as e:
    st = e.code
check("/uploads/videos nao e mais servido (404)", st == 404, st)


print()
print("== #2 (caso critico) admin ORFAO: faculdade_id NULL sem ser super admin ==")
# Estado que o bug tratava como super admin. Criado on-the-fly porque o seed
# nao produz conta orfa -- ela so aparece via convite ou migracao legada.
with engine.connect() as c:
    c.execute(text("DELETE FROM usuarios WHERE email = 'orfao@cursaas.dev'"))
    c.commit()
from app.services.auth_service import AuthService as _AS
from sqlalchemy.orm import Session as _S
from app.models import Usuario as _U, RoleEnum as _R, AdminRoleEnum as _AR
with _S(engine) as _db:
    _db.add(_U(nome="Admin Orfao", email="orfao@cursaas.dev",
               senha=_AS.hash_password(SENHA), role=_R.admin,
               admin_role=_AR.admin_faculdade, faculdade_id=None, ativo=True))
    _db.commit()

t_orfao = login("orfao@cursaas.dev")
with engine.connect() as c:
    n_cursos = c.execute(text("SELECT COUNT(*) FROM cursos")).scalar()
    n_admins = c.execute(text("SELECT COUNT(*) FROM usuarios WHERE role='admin'")).scalar()
    n_alunos = c.execute(text("SELECT COUNT(*) FROM usuarios WHERE role='aluno'")).scalar()

st, body = req("GET", "/admin/cursos", token=t_orfao)
check(f"orfao NAO ve os {n_cursos} cursos", st == 200 and body == [], (st, body))

st, body = req("GET", "/auth/admins", token=t_orfao)
check(f"orfao NAO ve os {n_admins} admins",
      st == 200 and body["total"] == 0, (st, body.get("total") if st == 200 else body))

st, body = req("GET", "/alunos/", token=t_orfao)
check(f"orfao NAO ve os {n_alunos} alunos", st == 200 and body == [], (st, body))

st, body = req("GET", "/cursos/1", token=t_orfao)
check("orfao NAO le curso de outro tenant (403)", st == 403, (st, body))

st, body = req("GET", "/faculdades/1/alunos", token=t_orfao)
check("orfao NAO acessa alunos da faculdade 1 (403)", st == 403, (st, body))


print()
print("=" * 50)
print(f"PASS: {ok}   FAIL: {fail}")
