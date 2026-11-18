import { AuthForm } from "@/auth/auth-form";
export function LoginPage() {
  return (
    <AuthForm
      application="contractor"
      mode="login"
      title="Tu oficio merece más oportunidades."
      description="Un espacio de trabajo para encontrar clientes, presentar propuestas y acompañar cada proyecto."
      benefits={[
        "Solicitudes según tu especialidad",
        "Propuestas y proyectos organizados",
        "Tu ficha profesional y tus credenciales",
      ]}
    />
  );
}
