import { AuthForm } from "@/auth/auth-form";
export function LoginPage() {
  return (
    <AuthForm
      application="admin"
      mode="login"
      title="Todo el control, en un solo panel."
      description="Accede a las herramientas de operación para revisar profesionales y mantener organizado el directorio."
      benefits={[
        "Revisión de fichas y credenciales",
        "Gestión de perfiles y catálogo",
        "Actividad y configuración del prototipo",
      ]}
    />
  );
}
