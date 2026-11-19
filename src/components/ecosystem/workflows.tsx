import { AttachmentsPanel } from "./attachments-panel";
import { ProjectFeedback } from "./pilot-panels";
import { useRef } from "react";
import { lineCents } from "@/domain/estimating";
import { isGuestOwner } from "@/domain/guest-quotes";
import {
  PiArrowRight,
  PiCheck,
  PiClock,
  PiChatCircleDots,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { useStore, allowedRequests } from "@/domain/store";
import {
  money,
  type Language,
  type QuoteRequest,
  type Project,
} from "@/domain/types";
import { categoryName, serviceName } from "@/data/catalog";
import { navigate } from "@/lib/navigation";
import { Panel, Empty, copy } from "./primitives";
import { Missing } from "./public-pages";

export function RequestList({
  language,
  contractor = false,
}: {
  language: Language;
  contractor?: boolean;
}) {
  const { state, professionalId } = useStore();
  const t = copy(language);
  const rows = contractor
    ? allowedRequests(state, professionalId)
    : state.requests;
  return (
    <Panel
      title={
        contractor
          ? t(
              "Oportunidades para tu especialidad",
              "Opportunities for your specialty",
            )
          : t("Mis solicitudes", "My requests")
      }
      action={
        !contractor && (
          <Button onClick={() => navigate("/quote")}>
            {t("Nueva solicitud", "New request")}
          </Button>
        )
      }
    >
      {rows.length ? (
        <div className="eco-records">
          {rows.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              language={language}
              contractor={contractor}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={
            contractor
              ? t("No tienes oportunidades abiertas", "No open opportunities")
              : t(
                  "Tu próximo proyecto empieza aquí",
                  "Your next project starts here",
                )
          }
          description={
            contractor
              ? t(
                  "Las solicitudes compatibles con tu especialidad aparecerán aquí. Mantén tu ficha y cobertura actualizadas.",
                  "Requests matching your specialty will appear here. Keep your profile and coverage up to date.",
                )
              : t(
                  "Publica una idea y revisa aquí las propuestas de los contratistas.",
                  "Post an idea and review contractor proposals here.",
                )
          }
        >
          <Button
            variant="outline"
            onClick={() =>
              navigate(contractor ? "/workspace/contractor/profile" : "/quote")
            }
          >
            {contractor
              ? t("Revisar mi ficha", "Review my profile")
              : t("Publicar un proyecto", "Post a project")}
          </Button>
        </Empty>
      )}
    </Panel>
  );
}
export function RequestRow({
  request,
  language,
  contractor = false,
}: {
  request: QuoteRequest;
  language: Language;
  contractor?: boolean;
}) {
  const { state } = useStore();
  const t = copy(language);
  const proposals = state.proposals.filter((p) => p.requestId === request.id);
  return (
    <button
      className="eco-record"
      onClick={() =>
        navigate(
          `/workspace/${contractor ? "contractor" : "owner"}/requests/${request.id}`,
        )
      }
    >
      <span className="record-symbol">
        <PiClock />
      </span>
      <div>
        <span className="eyebrow">
          {categoryName(request.categoryId, language)}
        </span>
        <h3>{request.title}</h3>
        <p>
          {request.location} · {serviceName(request.serviceId, language)}
        </p>
      </div>
      <div className="record-end">
        <span className={`eco-badge ${request.status}`}>
          {request.status === "open"
            ? t("Abierta", "Open")
            : request.status === "awarded"
              ? t("Adjudicada", "Awarded")
              : t("Cancelada", "Cancelled")}
        </span>
        <span>
          {proposals.length} {t("propuestas", "proposals")}
        </span>
      </div>
      <PiArrowRight />
    </button>
  );
}
export function RequestDetail({
  id,
  language,
  contractor = false,
}: {
  id: string;
  language: Language;
  contractor?: boolean;
}) {
  const { state, professionalId, send } = useStore();
  const t = copy(language);
  const request = state.requests.find((r) => r.id === id);
  const accepting = useRef(false);
  const canView =
    request &&
    (!contractor ||
      allowedRequests(state, professionalId).some((r) => r.id === id) ||
      state.proposals.some(
        (p) => p.requestId === id && p.professionalId === professionalId,
      ));
  if (!request || !canView) return <Missing language={language} />;
  const proposals = state.proposals.filter(
    (p) =>
      p.requestId === id &&
      (!contractor || p.professionalId === professionalId),
  );
  const own = proposals.find((p) => p.professionalId === professionalId);
  return (
    <div className="detail-columns">
      <div>
        <AttachmentsPanel
          targetId={request.id}
          purpose="request"
          canUpload={!contractor}
        />
        <Panel title={request.title}>
          <span className={`eco-badge ${request.status}`}>
            {request.status === "open"
              ? t("Solicitud abierta", "Open request")
              : request.status === "awarded"
                ? t("Proyecto adjudicado", "Project awarded")
                : t("Solicitud cancelada", "Request cancelled")}
          </span>
          <p className="eco-detail-location">{request.location}</p>
          <p className="eco-body whitespace-pre-wrap">{request.description}</p>
          <dl className="eco-definition">
            <div>
              <dt>{t("Servicio", "Service")}</dt>
              <dd>{serviceName(request.serviceId, language)}</dd>
            </div>
            <div>
              <dt>{t("Presupuesto orientativo", "Estimated budget")}</dt>
              <dd>
                {request.budget !== null
                  ? money(request.budget, language)
                  : t("Por acordar", "To be agreed")}
              </dd>
            </div>
            <div>
              <dt>{t("Fecha deseada", "Preferred date")}</dt>
              <dd>{request.date || t("Flexible", "Flexible")}</dd>
            </div>
            <div>
              <dt>{t("Destinatarios", "Recipients")}</dt>
              <dd>
                {request.professionalId
                  ? state.professionals.find(
                      (p) => p.id === request.professionalId,
                    )?.name
                  : t(
                      "Profesionales de la especialidad",
                      "Professionals in this specialty",
                    )}
              </dd>
            </div>
          </dl>
          {contractor && request.guestContact && (
            <div className="eco-notice">
              <h3>{t("Contacto del solicitante", "Requester contact")}</h3>
              <p>{request.guestContact.name}</p>
              <p>
                <a href={`mailto:${request.guestContact.email}`}>
                  {request.guestContact.email}
                </a>
              </p>
              {request.guestContact.phone && (
                <p>{request.guestContact.phone}</p>
              )}
            </div>
          )}
          {contractor &&
            isGuestOwner(request.ownerId) &&
            (request.professionalId === professionalId || own) && (
              <Button asChild variant="outline">
                <a
                  href={`#/workspace/contractor/messages?${new URLSearchParams({ owner: request.ownerId })}`}
                >
                  {t(
                    "Consultar conversación anterior",
                    "Read past conversation",
                  )}
                </a>
              </Button>
            )}
          {!contractor && request.status === "open" && (
            <Button
              variant="outline"
              onClick={() => send({ type: "cancel", requestId: id })}
            >
              {t("Cancelar solicitud", "Cancel request")}
            </Button>
          )}
        </Panel>
        <Panel
          title={
            contractor
              ? t("Tu propuesta", "Your proposal")
              : t("Compara las propuestas", "Compare proposals")
          }
        >
          {proposals.length ? (
            <div className="proposal-grid">
              {proposals.map((proposal) => {
                const professional = state.professionals.find(
                  (p) => p.id === proposal.professionalId,
                );
                return (
                  <article className="proposal-card" key={proposal.id}>
                    <span className={`eco-badge ${proposal.status}`}>
                      {proposal.status === "submitted"
                        ? t("Recibida", "Submitted")
                        : proposal.status === "accepted"
                          ? t("Aceptada", "Accepted")
                          : t("Cerrada", "Closed")}
                    </span>
                    <h3>{professional?.name}</h3>
                    <strong className="proposal-amount">
                      {money(proposal.amount, language, 2)}
                    </strong>
                    <p className="eco-note">
                      {proposal.days}{" "}
                      {t("días estimados · USD", "estimated days · USD")}
                    </p>
                    <p className="eco-body whitespace-pre-wrap">
                      {proposal.description}
                    </p>
                    {proposal.lines && (
                      <ul className="space-y-1">
                        {proposal.lines.map((line) => (
                          <li key={line.partId}>
                            {line.name} · {line.quantity} {line.unit} ×{" "}
                            {money(line.unitCents / 100, language, 2)} ={" "}
                            {money(lineCents(line) / 100, language, 2)}
                          </li>
                        ))}
                      </ul>
                    )}
                    {!contractor &&
                      proposal.status === "submitted" &&
                      request.status === "open" && (
                        <Button
                          onClick={() => {
                            if (accepting.current) return;
                            accepting.current = true;
                            const projectId = send({
                              type: "accept",
                              proposalId: proposal.id,
                            });
                            navigate(`/workspace/owner/projects/${projectId}`);
                          }}
                        >
                          {t(
                            "Aceptar propuesta de prueba",
                            "Accept demo proposal",
                          )}
                          <PiCheck />
                        </Button>
                      )}
                    {!contractor && (
                      <Button
                        variant="ghost"
                        onClick={() =>
                          navigate(
                            "/workspace/owner/messages",
                            new URLSearchParams({
                              professional: proposal.professionalId,
                            }),
                          )
                        }
                      >
                        <PiChatCircleDots />
                        {t("Conversar", "Message")}
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty
              title={t("Aún no hay propuestas", "No proposals yet")}
              description={t(
                "Las respuestas de los contratistas aparecerán aquí para que puedas compararlas.",
                "Contractor responses will appear here for you to compare.",
              )}
            />
          )}
        </Panel>
      </div>
      <aside>
        {contractor && !own && request.status === "open" ? (
          <Panel title={t("Prepara tu propuesta", "Prepare your proposal")}>
            <p className="eco-body">
              {t(
                "Carga tus partidas y registra las mediciones para calcular el presupuesto de esta solicitud.",
                "Add your line items and record measurements to calculate the estimate for this request.",
              )}
            </p>
            <Button
              onClick={() =>
                navigate(
                  "/workspace/contractor/proposals",
                  new URLSearchParams({ request: request.id }),
                )
              }
            >
              {t("Preparar presupuesto", "Prepare estimate")}
            </Button>
          </Panel>
        ) : (
          <Panel title={t("El siguiente paso", "The next step")}>
            <p className="eco-body">
              {request.status === "awarded"
                ? t(
                    "La propuesta aceptada ya tiene un proyecto. Puedes seguir sus hitos desde Proyectos.",
                    "The accepted proposal now has a project. Follow its milestones under Projects.",
                  )
                : t(
                    "Una buena propuesta deja claro el precio, los materiales incluidos, el plazo y las condiciones.",
                    "A good proposal makes the price, included materials, timeframe and terms clear.",
                  )}
            </p>
            <p className="eco-note">
              {t(
                "Todo este proceso es una simulación local.",
                "This entire process is a local simulation.",
              )}
            </p>
          </Panel>
        )}
      </aside>
    </div>
  );
}
export function Projects({
  language,
  contractor = false,
  id,
}: {
  language: Language;
  contractor?: boolean;
  id?: string;
}) {
  const { state, professionalId, send } = useStore();
  const t = copy(language);
  const projects = state.projects.filter(
    (p) => !contractor || p.professionalId === professionalId,
  );
  const project = projects.find((p) => p.id === id);
  if (id && !project) return <Missing language={language} />;
  if (project) {
    const professional = state.professionals.find(
      (p) => p.id === project.professionalId,
    );
    const progress = Math.round(
      (project.milestones.filter((m) => m.done).length /
        project.milestones.length) *
        100,
    );
    return (
      <div className="detail-columns">
        <Panel title={project.title}>
          <span className={`eco-badge ${project.status}`}>
            {project.status === "completed"
              ? t("Completado", "Completed")
              : t("En marcha", "In progress")}
          </span>
          <p className="eco-body">
            {professional?.name} · {money(project.amount, language, 2)}
          </p>
          <div className="project-progress">
            <progress value={progress} max={100} />
            <strong>{progress}%</strong>
          </div>
          <div className="milestones">
            {project.milestones.map((m) => (
              <label key={m.id} className={m.done ? "done" : ""}>
                <input
                  type="checkbox"
                  checked={m.done}
                  disabled={!contractor || project.status === "completed"}
                  onChange={() =>
                    send({
                      type: "milestone",
                      projectId: project.id,
                      milestoneId: m.id,
                    })
                  }
                />
                <span>{m.title[language]}</span>
                {m.done && <PiCheck />}
              </label>
            ))}
          </div>
          <p className="eco-note">
            {contractor
              ? t(
                  "Actualiza los hitos conforme avanza el proyecto de prueba. Al completar los tres, el proyecto se cierra.",
                  "Update milestones as the demo project progresses. Completing all three closes the project.",
                )
              : t(
                  "El contratista actualiza los hitos desde su portal. Aquí puedes consultar los avances.",
                  "The contractor updates milestones from their portal. You can follow progress here.",
                )}
          </p>
        </Panel>
        <div>
          {!contractor && project.status === "completed" && (
            <ProjectFeedback projectId={project.id} />
          )}
          <Panel title={t("Resumen del acuerdo", "Agreement summary")}>
            <dl className="eco-definition">
              <div>
                <dt>{t("Profesional", "Professional")}</dt>
                <dd>{professional?.name}</dd>
              </div>
              <div>
                <dt>{t("Importe · USD", "Amount · USD")}</dt>
                <dd>{money(project.amount, language, 2)}</dd>
              </div>
              <div>
                <dt>{t("Pago", "Payment")}</dt>
                <dd>
                  {contractor ? (
                    t("En la web del contratista", "On the contractor website")
                  ) : (
                    <a className="text-link" href="#/cart">
                      {t("Ir al carrito para pagar", "Go to cart to pay")}
                    </a>
                  )}
                </dd>
              </div>
            </dl>
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  `/workspace/${contractor ? "contractor" : "owner"}/requests/${project.requestId}`,
                )
              }
            >
              {t("Ver solicitud y propuesta", "View request and proposal")}
            </Button>
          </Panel>
        </div>
      </div>
    );
  }
  return (
    <Panel title={t("Mis proyectos", "My projects")}>
      {projects.length ? (
        <div className="project-grid">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              language={language}
              contractor={contractor}
            />
          ))}
        </div>
      ) : (
        <Empty
          title={t(
            "Aquí tomarán forma tus proyectos",
            "Your projects will take shape here",
          )}
          description={t(
            "Un proyecto se crea cuando el propietario acepta una propuesta.",
            "A project is created when a homeowner accepts a proposal.",
          )}
        >
          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/workspace/${contractor ? "contractor" : "owner"}/requests`,
              )
            }
          >
            {t("Ver solicitudes", "View requests")}
          </Button>
        </Empty>
      )}
    </Panel>
  );
}
function ProjectCard({
  project,
  language,
  contractor,
}: {
  project: Project;
  language: Language;
  contractor: boolean;
}) {
  const t = copy(language);
  const progress = Math.round(
    (project.milestones.filter((m) => m.done).length /
      project.milestones.length) *
      100,
  );
  return (
    <button
      className="project-card"
      onClick={() =>
        navigate(
          `/workspace/${contractor ? "contractor" : "owner"}/projects/${project.id}`,
        )
      }
    >
      <span className={`eco-badge ${project.status}`}>
        {project.status === "completed"
          ? t("Completado", "Completed")
          : t("En marcha", "In progress")}
      </span>
      <h3>{project.title}</h3>
      <p>{money(project.amount, language, 2)}</p>
      <div className="project-progress">
        <progress value={progress} max={100} />
        <strong>{progress}%</strong>
      </div>
      <span className="text-link">
        {t("Ver proyecto", "View project")}
        <PiArrowRight />
      </span>
    </button>
  );
}
