import { AuthForm } from "@/auth/auth-form";
export function RegisterPage() {
  return (
    <AuthForm
      application="contractor"
      mode="register"
      title="Dale un lugar a tu experiencia."
      description="Crea tu cuenta profesional y prepara tu ficha. Empezará como borrador hasta que administración la publique."
      benefits={[
        "Registro con tu especialidad y ciudad",
        "Un perfil propio vinculado a tu cuenta",
        "Acceso a oportunidades y propuestas",
      ]}
    />
  );
}
