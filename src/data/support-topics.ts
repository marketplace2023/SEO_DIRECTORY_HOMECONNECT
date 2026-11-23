export const supportGreeting =
  "Hola, soy el asistente de HOME CONNECT. ¿Sobre qué tema necesitas ayuda? Selecciona una opción.";
export const supportTopics = [
  {
    id: "vip",
    questions: [
      {
        id: "activate",
        label: "¿Cómo solicito la membresía VIP?",
        answer:
          "Entra con tu cuenta de contratista y pulsa «Solicitar acceso VIP». La solicitud pasa a administración para su revisión.",
      },
      {
        id: "wait",
        label: "Ya solicité VIP. ¿Cuándo empieza mi acceso?",
        answer:
          "El acceso anticipado empieza cuando administración activa tu membresía. Si necesitas consultar el estado de tu solicitud, puedes pedir que un agente revise este ticket.",
      },
      {
        id: "time",
        label: "¿Cuánto dura la ventaja VIP?",
        answer:
          "Durante los primeros cinco minutos desde que el consumidor publica una solicitud general compatible, los contratistas VIP pueden verla en Oportunidades. Después se abre al resto de contratistas compatibles.",
      },
      {
        id: "match",
        label: "¿Por qué no veo una solicitud con VIP activo?",
        answer:
          "Comprueba que tu especialidad y zona de cobertura coincidan con el proyecto. Una solicitud dirigida a otro profesional solo aparece para su destinatario.",
      },
    ],
    label: "Membresía VIP",
    answer:
      "En el panel del contratista, pulsa «Solicitar acceso VIP». Administración revisa la solicitud. Con VIP activo, las oportunidades generales compatibles aparecen cinco minutos antes de la apertura general.",
  },
  {
    id: "images",
    questions: [
      {
        id: "upload",
        label: "¿Dónde adjunto las fotos?",
        answer:
          "Al crear la solicitud, busca «Imágenes de referencia». Arrastra las fotos al recuadro o púlsalo para elegirlas desde tu dispositivo.",
      },
      {
        id: "limits",
        label: "¿Cuántas imágenes puedo subir y de qué tamaño?",
        answer:
          "Puedes adjuntar hasta dos imágenes en JPEG, PNG o WebP. Cada una puede pesar hasta 5 MB.",
      },
      {
        id: "replace",
        label: "¿Cómo cambio una foto antes de publicar?",
        answer:
          "Quita la imagen desde su vista previa y selecciona la foto correcta en el mismo recuadro.",
      },
      {
        id: "view",
        label: "¿Quién puede ver mis imágenes?",
        answer:
          "Los contratistas que reciban la solicitud podrán abrir sus detalles y consultar las imágenes para preparar su propuesta.",
      },
    ],
    label: "Imágenes de referencia",
    answer:
      "En «Imágenes de referencia» de la solicitud puedes arrastrar o seleccionar hasta dos archivos JPEG, PNG o WebP de hasta 5 MB cada uno. El contratista que reciba la solicitud podrá verlos en el detalle.",
  },
  {
    id: "account",
    questions: [
      {
        id: "portal",
        label: "¿Por cuál panel debo entrar?",
        answer:
          "Usa el acceso de consumidor para gestionar tus proyectos, el de contratista para gestionar oportunidades o el de administración si el equipo te asignó esa cuenta.",
      },
      {
        id: "reset",
        label: "¿Cómo recupero mi contraseña?",
        answer:
          "En la pantalla de acceso de tu panel, pulsa «Olvidé mi contraseña» y escribe el correo asociado a tu cuenta.",
      },
      {
        id: "email",
        label: "¿Qué correo uso para recuperar el acceso?",
        answer:
          "Usa el mismo correo que registraste para ese panel. Si ya no tienes acceso a él, solicita atención de un agente desde este ticket.",
      },
    ],
    label: "Acceso y contraseña",
    answer:
      "En el inicio de sesión de tu panel, pulsa «Olvidé mi contraseña» e introduce el correo con el que te registraste para solicitar el enlace de recuperación.",
  },
  {
    id: "messages",
    questions: [
      {
        id: "open",
        label: "¿Dónde encuentro mi conversación?",
        answer:
          "Entra en «Mensajes» y busca a la persona en la lista de conversaciones. Selecciona su nombre para abrir el historial.",
      },
      {
        id: "reply",
        label: "¿Cómo respondo a un contacto?",
        answer:
          "Abre la conversación, escribe en el cuadro inferior y pulsa «Enviar». Comprueba el nombre en la cabecera antes de enviarlo.",
      },
      {
        id: "switch",
        label: "¿Cómo cambio de conversación desde el móvil?",
        answer:
          "Pulsa la flecha superior del chat para volver a la lista y elige el contacto con el que quieres hablar.",
      },
    ],
    label: "Mensajería",
    answer:
      "Abre «Mensajes» en tu panel, selecciona el contacto y escribe en el cuadro inferior. En móvil, la flecha superior te devuelve a las conversaciones.",
  },
  {
    id: "map",
    questions: [
      {
        id: "move",
        label: "¿Cómo busco profesionales en otra zona?",
        answer:
          "Arrastra el mapa hasta la zona que te interesa y ajusta el zoom. El listado se actualiza con los profesionales del área visible.",
      },
      {
        id: "empty",
        label: "¿Por qué aparece vacío el listado?",
        answer:
          "Aleja el zoom para ampliar el área y revisa los filtros de categoría y ubicación. El listado muestra los profesionales que coinciden con esa búsqueda.",
      },
      {
        id: "layout",
        label: "¿Cómo veo los perfiles en formato de lista?",
        answer:
          "En el panel de resultados junto al mapa, selecciona la vista de lista. Puedes volver a la vista de tarjetas desde el mismo selector.",
      },
    ],
    label: "Mapa y cobertura",
    answer:
      "En el mapa, arrastra o cambia el zoom para actualizar los perfiles de la zona visible. Si la lista queda vacía, aleja el zoom o revisa los filtros de especialidad.",
  },
  {
    id: "quotes",
    questions: [
      {
        id: "create",
        label: "¿Qué datos necesito para pedir un presupuesto?",
        answer:
          "Desde tu cuenta de consumidor con correo confirmado, indica el título, la categoría, el servicio, la ubicación y la descripción del proyecto.",
      },
      {
        id: "budget",
        label: "¿Necesito tener un presupuesto o una fecha definidos?",
        answer:
          "El presupuesto orientativo y la fecha deseada son opcionales. Puedes publicar la solicitud describiendo el trabajo aunque todavía estés definiendo esos detalles.",
      },
      {
        id: "proposals",
        label: "¿Dónde reviso las propuestas que recibí?",
        answer:
          "Entra a tu panel de consumidor y abre el apartado de propuestas. Revisa lo que ofrece el contratista antes de aceptar su cotización.",
      },
    ],
    label: "Solicitudes y presupuestos",
    answer:
      "Desde el marketplace, abre «Solicitar un presupuesto» con tu cuenta de consumidor y correo confirmado. Indica servicio, ubicación y descripción. Después de publicar, encontrarás las propuestas en tu panel.",
  },
  {
    id: "favorites",
    questions: [
      {
        id: "save",
        label: "¿Cómo añado un profesional a mis favoritos?",
        answer:
          "Busca al profesional en el directorio y pulsa el corazón de su tarjeta para añadirlo a tu selección.",
      },
      {
        id: "find",
        label: "¿Dónde encuentro los perfiles que marqué?",
        answer:
          "Abre «Favoritos» en tu cuenta de consumidor para volver a consultar los perfiles que seleccionaste.",
      },
      {
        id: "remove",
        label: "¿Cómo quito un profesional de mis favoritos?",
        answer:
          "Vuelve a pulsar el corazón marcado en la tarjeta del profesional para retirarlo de tu selección.",
      },
    ],
    label: "Favoritos",
    answer:
      "Pulsa el corazón en la tarjeta del profesional. Puedes consultar tu selección desde «Favoritos» en tu cuenta de consumidor.",
  },
  {
    id: "other",
    questions: [
      {
        id: "ticket",
        label: "¿Dónde encuentro el número de mi ticket?",
        answer:
          "Al pulsar «Hablar con un agente», recibirás el código de tu ticket en este chat. También aparecerá junto a tu consulta en «Ayuda y soporte».",
      },
      {
        id: "history",
        label: "¿Cómo consulto las respuestas anteriores?",
        answer:
          "Selecciona el ticket en la lista de soporte. El chat conserva tu solicitud original, tus selecciones y las respuestas que hayas recibido.",
      },
      {
        id: "human",
        label: "¿Qué hago si mi problema sigue pendiente?",
        answer:
          "Pulsa «Hablar con un agente» en este chat y añade los detalles del problema. El agente podrá revisar la conversación y responder en el mismo ticket.",
      },
    ],
    label: "Otro motivo",
    answer:
      "Puedo ayudarte a localizar tu ticket, consultar su historial o pedir una revisión personal. ¿Qué necesitas hacer?",
  },
] as const;

export function currentSupportTopic(ticket: {
  topicId?: string;
  history?: { author: string; text: string }[];
}) {
  if (ticket.topicId)
    return supportTopics.find((topic) => topic.id === ticket.topicId);
  // Tickets opened before the guided questions recorded the selected label in the chat.
  return supportTopics.find((topic) =>
    ticket.history?.some(
      (entry) => entry.author === "customer" && entry.text === topic.label,
    ),
  );
}
