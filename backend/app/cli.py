"""Tareas de administración.

    python -m app.cli reset-password persona@ejemplo.com

No hay recuperación de contraseña por correo: quien administra la app la
restablece con este comando.
"""
import argparse
import getpass
import sys

from sqlmodel import Session, select

from app.core.database import engine
from app.core.security import MAX_PASSWORD_BYTES, hash_password
from app.models.user import User
from app.schemas.user import MIN_PASSWORD_LENGTH


def reset_password(email: str) -> int:
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email.lower())).first()
        if not user:
            print(f"No existe ningún usuario con el email {email}", file=sys.stderr)
            return 1

        password = getpass.getpass("Nueva contraseña: ")
        if password != getpass.getpass("Repítela: "):
            print("Las contraseñas no coinciden", file=sys.stderr)
            return 1
        if len(password) < MIN_PASSWORD_LENGTH or len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
            print(f"Debe tener entre {MIN_PASSWORD_LENGTH} caracteres y {MAX_PASSWORD_BYTES} bytes", file=sys.stderr)
            return 1

        user.password_hash = hash_password(password)
        session.add(user)
        session.commit()
        print(f"Contraseña actualizada para {user.email}")
        return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    reset = commands.add_parser("reset-password", help="Restablece la contraseña de un usuario")
    reset.add_argument("email")
    args = parser.parse_args()

    # En desarrollo el motor vuelca cada consulta; aquí solo estorba
    engine.echo = False

    if args.command == "reset-password":
        return reset_password(args.email)
    return 1


if __name__ == "__main__":
    sys.exit(main())
