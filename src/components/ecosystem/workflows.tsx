import { AttachmentsPanel } from "./attachments-panel";
import { ProjectFeedback } from "./pilot-panels";
import { useRef, useState, type FormEvent } from "react";
import {
  PiArrowRight,
  PiCheck,
  PiClock,
  PiChatCircleDots,
} from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStore, allowedRequests } from "@/domain/store";
import {
  money,
  type Language,
  type QuoteRequest,
  type Project,
} from "@/domain/types";
import { categoryName, serviceName } from "@/data/catalog";
import { navigate } from "@/lib/navigation";
import { Field, Panel, Empty, copy } from "./primitives";
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
  const [error, setError] = useState("");
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
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount"));
    const days = Number(data.get("days"));
    const description = String(data.get("description")).trim();
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isInteger(days) ||
      days <= 0 ||
      !description
    ) {
      setError(
        t(
          "Revisa el importe, el plazo y el alcance.",
          "Check the amount, timeframe and scope.",
        ),
      );
      return;
    }
    send({
      type: "proposal",
      value: { requestId: id, amount, days, description },
    });
    setError("");
  };
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
                      {money(proposal.amount, language)}
                    </strong>
                    <p className="eco-note">
                      {proposal.days}{" "}
                      {t("días estimados · USD", "estimated days · USD")}
                    </p>
                    <p className="eco-body whitespace-pre-wrap">
                      {proposal.description}
                    </p>
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
            <form className="eco-form" onSubmit={submit}>
              <Field label={t("Importe total · USD", "Total amount · USD")}>
                <Input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </Field>
              <Field
                label={t("Plazo estimado · días", "Estimated timeframe · days")}
              >
                <Input name="days" type="number" min="1" step="1" required />
              </Field>
              <Field
                label={t(
                  "Alcance, materiales y condiciones",
                  "Scope, materials and terms",
                )}
              >
                <Textarea
                  name="description"
                  rows={5}
                  required
                  maxLength={3000}
                />
              </Field>
              {error && (
                <p role="alert" className="eco-error">
                  {error}
                </p>
              )}
              <Button type="submit">
                {t("Enviar propuesta de prueba", "Send demo proposal")}
              </Button>
              <p className="eco-note">
                {t(
                  "No se contacta a personas reales. El propietario podrá comparar tu propuesta en su espacio.",
                  "No real people are contacted. The homeowner can compare your proposal in their workspace.",
                )}
              </p>
            </form>
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
            {professional?.name} · {money(project.amount, language)}
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
                <dd>{money(project.amount, language)}</dd>
              </div>
              <div>
                <dt>{t("Pago", "Payment")}</dt>
                <dd>
                  {t("Sin cobro · demostración", "No charge · demonstration")}
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
      <p>{money(project.amount, language)}</p>
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
