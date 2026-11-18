import { AuthForm } from "@/auth/auth-form";
export function RegisterPage() {
  return (
    <AuthForm
      application="web"
      mode="register"
      title="Hagamos realidad tu próxima idea."
      description="Crea tu cuenta de consumidor para guardar profesionales y gestionar tus solicitudes desde la web."
      benefits={[
        "Una cuenta para tus proyectos",
        "Solicitudes y presupuestos organizados",
        "Contacto con profesionales del directorio",
      ]}
    />
  );
}
