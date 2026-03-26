"""
Serviço de envio de e-mail via SMTP.
Configurado com variáveis de ambiente. Em desenvolvimento, imprime o link no console.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings

logger = logging.getLogger(__name__)


def _build_invite_html(nome_convidante: str, link: str, role_label: str, horas: int) -> str:
    return f"""
<!DOCTYPE html>
<html lang="pt-br">
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f6f8;padding:30px;">
  <div style="max-width:520px;margin:0 auto;background:white;border-radius:10px;
              box-shadow:0 2px 8px rgba(0,0,0,.1);overflow:hidden;">
    <div style="background:#2c3e50;padding:22px 28px;">
      <h1 style="color:white;margin:0;font-size:1.3rem;">🔐 Convite para Administrador</h1>
    </div>
    <div style="padding:28px;">
      <p style="color:#2c3e50;font-size:1rem;">
        <strong>{nome_convidante}</strong> convidou você para se tornar
        <strong>{role_label}</strong> no portal <strong>Cursaas</strong>.
      </p>
      <p style="color:#555;font-size:.92rem;">
        Clique no botão abaixo para definir sua senha e ativar sua conta.
        O link expira em <strong>{horas} horas</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{link}"
           style="background:#3498db;color:white;padding:13px 30px;border-radius:6px;
                  text-decoration:none;font-weight:600;font-size:.95rem;display:inline-block;">
          Ativar minha conta
        </a>
      </div>
      <p style="color:#999;font-size:.8rem;">
        Se você não esperava este convite, ignore este e-mail.<br>
        Link direto: <a href="{link}" style="color:#3498db;">{link}</a>
      </p>
    </div>
  </div>
</body>
</html>
"""


def enviar_convite(destinatario: str, nome_convidante: str, link: str,
                   role_label: str, horas: int) -> bool:
    """
    Envia o e-mail de convite.
    Retorna True se enviado com sucesso, False caso contrário.
    Em desenvolvimento (SMTP_HOST ausente), apenas loga o link.
    """
    html = _build_invite_html(nome_convidante, link, role_label, horas)

    if not getattr(settings, "SMTP_HOST", None):
        # Modo desenvolvimento: exibe no log
        logger.warning(
            "\n[DEV] E-mail de convite NÃO enviado (SMTP não configurado).\n"
            f"  Para: {destinatario}\n"
            f"  Link: {link}\n"
        )
        print(f"\n[CONVITE DEV] Link para {destinatario}:\n  {link}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Convite para administrar o Cursaas"
        msg["From"]    = settings.SMTP_FROM
        msg["To"]      = destinatario
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, int(settings.SMTP_PORT)) as server:
            server.ehlo()
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_FROM, [destinatario], msg.as_string())
        return True
    except Exception as exc:
        logger.error("Falha ao enviar e-mail de convite para %s: %s", destinatario, exc)
        return False
