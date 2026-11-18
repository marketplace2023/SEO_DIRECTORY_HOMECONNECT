import { useAuth } from "@/auth/auth-provider";
import { Panel } from "@/components/ecosystem/primitives";
import { Button } from "@/components/ui/button";
export function AccountPage() {
  const { user, logout } = useAuth();
  return (
    <Panel title="Mi cuenta">
      <dl className="eco-definition">
        <div>
          <dt>Nombre</dt>
          <dd>{user?.name}</dd>
        </div>
        <div>
          <dt>Correo electrónico</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt>Tipo de cuenta</dt>
          <dd>Contratista</dd>
        </div>
        <div>
          <dt>Ficha vinculada</dt>
          <dd>{user?.professionalId}</dd>
        </div>
      </dl>
      <Button
        variant="outline"
        onClick={() =>
          void logout().finally(() => {
            window.location.hash = "/login";
          })
        }
      >
        Cerrar sesión
      </Button>
    </Panel>
  );
}
