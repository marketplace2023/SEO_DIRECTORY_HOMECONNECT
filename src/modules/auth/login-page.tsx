import { AuthForm } from "@/auth/auth-form";
export function LoginPage() {
  return (
    <AuthForm
      application="web"
      mode="login"
      title="Buenas ideas. Mejores conexiones."
      description="Encuentra profesionales, comparte lo que necesitas y lleva el seguimiento de tu próximo proyecto."
      benefits={[
        "Profesionales según tu necesidad",
        "Todas tus propuestas en un lugar",
        "Proyectos y conversaciones a mano",
      ]}
    />
  );
}
