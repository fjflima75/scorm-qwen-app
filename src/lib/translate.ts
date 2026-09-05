/* Translation system.
   Creates a DUPLICATE course in another language — the original is never modified.
   Dictionary-driven (en → es, pt-PT today; architecture supports more).
   Player chrome strings come from CHROME_STRINGS in ai.ts.
   Preserves {placeholders}, URLs and numerals. RTL languages flagged for the renderer. */

import { Block, Course, Question, uid } from "./types";

export const RTL_LANGS = ["ar", "he", "fa", "ur"];
export const isRTL = (lang: string) => RTL_LANGS.includes(lang);

export const TRANSLATION_TARGETS = [
  { code: "es", name: "Spanish", ready: true },
  { code: "pt-PT", name: "Portuguese (Portugal)", ready: true },
  { code: "fr", name: "French", ready: false },
  { code: "de", name: "German", ready: false },
  { code: "it", name: "Italian", ready: false },
  { code: "nl", name: "Dutch", ready: false },
  { code: "pt-BR", name: "Portuguese (Brazil)", ready: false },
  { code: "ar", name: "Arabic", ready: false },
  { code: "he", name: "Hebrew", ready: false },
];

type Dict = [string, string][];

const ES: Dict = [
  ["knowledge check", "comprobación de conocimientos"], ["learning objectives", "objetivos de aprendizaje"],
  ["final assessment", "evaluación final"], ["active listening", "escucha activa"],
  ["body language", "lenguaje corporal"], ["difficult conversations", "conversaciones difíciles"],
  ["constructive feedback", "feedback constructivo"], ["workplace communication", "comunicación laboral"],
  ["key points", "puntos clave"], ["check answer", "comprobar respuesta"], ["check answers", "comprobar respuestas"],
  ["click to reveal", "haz clic para revelar"], ["mark lesson complete", "marcar lección como completada"],
  ["pass mark", "nota de aprobado"], ["good choice", "buena elección"], ["knowledge", "conocimiento"],
  ["message", "mensaje"], ["listener", "oyente"], ["listening", "escucha"], ["listen", "escuchar"],
  ["feedback", "feedback"], ["conversation", "conversación"], ["communication", "comunicación"],
  ["communicate", "comunicar"], ["course", "curso"], ["lesson", "lección"], ["module", "módulo"],
  ["assessment", "evaluación"], ["question", "pregunta"], ["questions", "preguntas"], ["answer", "respuesta"],
  ["answers", "respuestas"], ["correct", "correcto"], ["incorrect", "incorrecto"], ["learner", "estudiante"],
  ["learners", "estudiantes"], ["manager", "responsable"], ["managers", "responsables"],
  ["employee", "empleado"], ["team", "equipo"], ["teams", "equipos"], ["meeting", "reunión"],
  ["meetings", "reuniones"], ["email", "correo electrónico"], ["clarity", "claridad"], ["clear", "claro"],
  ["concise", "conciso"], ["empathy", "empatía"], ["empathetic", "empático"], ["respect", "respeto"],
  ["trust", "confianza"], ["confidence", "seguridad"], ["scenario", "escenario"], ["example", "ejemplo"],
  ["examples", "ejemplos"], ["practice", "práctica"], ["tips", "consejos"], ["tip", "consejo"],
  ["remember", "recuerda"], ["avoid", "evita"], ["always", "siempre"], ["never", "nunca"],
  ["before", "antes"], ["after", "después"], ["first", "primero"], ["then", "luego"],
  ["next", "siguiente"], ["summary", "resumen"], ["introduction", "introducción"], ["conclusion", "conclusión"],
  ["objective", "objetivo"], ["skill", "habilidad"], ["skills", "habilidades"], ["behavior", "comportamiento"],
  ["situation", "situación"], ["challenge", "reto"], ["challenges", "retos"], ["solution", "solución"],
  ["improve", "mejorar"], ["learn", "aprender"], ["learning", "aprendizaje"], ["apply", "aplicar"],
  ["understand", "entender"], ["explain", "explicar"], ["identify", "identificar"], ["describe", "describir"],
  ["effective", "eficaz"], ["essential", "esencial"], ["essentials", "fundamentos"], ["foundations", "fundamentos"],
  ["practical", "práctico"], ["professional", "profesional"], ["workplace", "entorno laboral"],
  ["angry", "enfadado"], ["customer", "cliente"], ["colleague", "compañero"], ["deadline", "fecha límite"],
  ["project", "proyecto"], ["task", "tarea"], ["goal", "objetivo"], ["goals", "objetivos"],
  ["time", "tiempo"], ["words", "palabras"], ["tone", "tono"], ["intent", "intención"],
  ["impact", "impacto"], ["result", "resultado"], ["results", "resultados"], ["complete", "completar"],
  ["start", "empezar"], ["finish", "terminar"], ["why", "por qué"], ["what", "qué"], ["how", "cómo"],
  ["when", "cuándo"], ["true", "verdadero"], ["false", "falso"], ["the", "el"], ["and", "y"],
  ["with", "con"], ["without", "sin"], ["for", "para"], ["from", "de"], ["your", "tu"], ["their", "su"],
  ["this", "esto"], ["that", "eso"], ["people", "personas"], ["person", "persona"], ["way", "manera"],
  ["new", "nuevo"], ["best", "mejor"], ["most", "más"], ["very", "muy"], ["also", "también"],
  ["about", "sobre"], ["into", "en"], ["can", "puedes"], ["should", "deberías"], ["will", "vas a"],
  ["have", "tener"], ["make", "hacer"], ["take", "tomar"], ["give", "dar"], ["work", "trabajo"],
  ["working", "trabajando"], ["talk", "hablar"], ["talking", "hablando"], ["ask", "preguntar"],
  ["asking", "preguntando"], ["respond", "responder"], ["pause", "pausa"], ["silence", "silencio"],
  ["interrupt", "interrumpir"], ["interrupting", "interrumpiendo"], ["assumptions", "suposiciones"],
  ["assume", "suponer"], ["clarify", "aclarar"], ["paraphrase", "parafrasear"], ["summarize", "resumir"],
  ["acknowledge", "reconocer"], ["defensive", "defensivo"], ["blame", "culpa"], ["praise", "elogio"],
  ["specific", "específico"], ["actionable", "accionable"], ["timely", "oportuno"], ["private", "privado"],
  ["public", "público"], ["focus", "céntrate"], ["stay", "mantente"], ["keep", "mantén"],
  ["use", "usa"], ["using", "usando"], ["try", "prueba"], ["choose", "elige"], ["option", "opción"],
  ["options", "opciones"], ["choice", "elección"], ["choices", "elecciones"], ["consequence", "consecuencia"],
  ["consequences", "consecuencias"], ["outcome", "resultado"], ["outcomes", "resultados"],
  ["continue", "continuar"], ["replay", "repetir"], ["hidden", "oculto"], ["reveal", "revelar"],
  ["flip", "gira"], ["card", "tarjeta"], ["cards", "tarjetas"], ["step", "paso"], ["steps", "pasos"],
  ["process", "proceso"], ["checklist", "lista de verificación"], ["key", "clave"], ["point", "punto"],
  ["idea", "idea"], ["ideas", "ideas"], ["content", "contenido"], ["section", "sección"],
  ["chapter", "capítulo"], ["title", "título"], ["description", "descripción"], ["audience", "audiencia"],
  ["duration", "duración"], ["minutes", "minutos"], ["seconds", "segundos"], ["language", "idioma"],
  ["certificate", "certificado"], ["completion", "finalización"], ["score", "puntuación"],
  ["passed", "aprobado"], ["failed", "no aprobado"], ["attempt", "intento"], ["attempts", "intentos"],
  ["welcome", "bienvenido"], ["hello", "hola"], ["thank you", "gracias"], ["please", "por favor"],
  ["great", "genial"], ["good", "bueno"], ["bad", "malo"], ["important", "importante"],
  ["attention", "atención"], ["understanding", "comprensión"], ["misunderstanding", "malentendido"],
  ["conflict", "conflicto"], ["resolve", "resolver"], ["approach", "enfoque"], ["strategy", "estrategia"],
  ["technique", "técnica"], ["techniques", "técnicas"], ["principle", "principio"], ["principles", "principios"],
  ["habit", "hábito"], ["habits", "hábitos"], ["everyday", "cotidiano"], ["daily", "diario"],
  ["often", "a menudo"], ["usually", "normalmente"], ["sometimes", "a veces"], ["instead", "en su lugar"],
  ["however", "sin embargo"], ["because", "porque"], ["therefore", "por lo tanto"], ["so that", "para que"],
  ["in order to", "para"], ["as well as", "así como"], ["such as", "como"], ["for example", "por ejemplo"],
  ["in fact", "de hecho"], ["on the other hand", "por otro lado"], ["at the end", "al final"],
  ["at the beginning", "al principio"], ["in this lesson", "en esta lección"], ["in this module", "en este módulo"],
  ["you will learn", "aprenderás"], ["you will be able to", "serás capaz de"], ["by the end", "al terminar"],
  ["the most", "lo más"], ["one of the", "uno de los"], ["each other", "entre sí"],
];

const PT: Dict = [
  ["knowledge check", "verificação de conhecimentos"], ["learning objectives", "objetivos de aprendizagem"],
  ["final assessment", "avaliação final"], ["active listening", "escuta ativa"],
  ["body language", "linguagem corporal"], ["difficult conversations", "conversas difíceis"],
  ["constructive feedback", "feedback construtivo"], ["workplace communication", "comunicação no trabalho"],
  ["key points", "pontos-chave"], ["check answer", "verificar resposta"], ["check answers", "verificar respostas"],
  ["click to reveal", "clique para revelar"], ["mark lesson complete", "marcar lição como concluída"],
  ["pass mark", "nota mínima"], ["good choice", "boa escolha"], ["knowledge", "conhecimento"],
  ["message", "mensagem"], ["listener", "ouvinte"], ["listening", "escuta"], ["listen", "ouvir"],
  ["feedback", "feedback"], ["conversation", "conversação"], ["communication", "comunicação"],
  ["communicate", "comunicar"], ["course", "curso"], ["lesson", "lição"], ["module", "módulo"],
  ["assessment", "avaliação"], ["question", "pergunta"], ["questions", "perguntas"], ["answer", "resposta"],
  ["answers", "respostas"], ["correct", "correto"], ["incorrect", "incorreto"], ["learner", "formando"],
  ["learners", "formandos"], ["manager", "gestor"], ["managers", "gestores"],
  ["employee", "colaborador"], ["team", "equipa"], ["teams", "equipas"], ["meeting", "reunião"],
  ["meetings", "reuniões"], ["email", "e-mail"], ["clarity", "clareza"], ["clear", "claro"],
  ["concise", "conciso"], ["empathy", "empatia"], ["empathetic", "empático"], ["respect", "respeito"],
  ["trust", "confiança"], ["confidence", "confiança"], ["scenario", "cenário"], ["example", "exemplo"],
  ["examples", "exemplos"], ["practice", "prática"], ["tips", "dicas"], ["tip", "dica"],
  ["remember", "lembre-se"], ["avoid", "evite"], ["always", "sempre"], ["never", "nunca"],
  ["before", "antes"], ["after", "depois"], ["first", "primeiro"], ["then", "de seguida"],
  ["next", "seguinte"], ["summary", "resumo"], ["introduction", "introdução"], ["conclusion", "conclusão"],
  ["objective", "objetivo"], ["skill", "competência"], ["skills", "competências"], ["behavior", "comportamento"],
  ["situation", "situação"], ["challenge", "desafio"], ["challenges", "desafios"], ["solution", "solução"],
  ["improve", "melhorar"], ["learn", "aprender"], ["learning", "aprendizagem"], ["apply", "aplicar"],
  ["understand", "compreender"], ["explain", "explicar"], ["identify", "identificar"], ["describe", "descrever"],
  ["effective", "eficaz"], ["essential", "essencial"], ["essentials", "fundamentos"], ["foundations", "fundamentos"],
  ["practical", "prático"], ["professional", "profissional"], ["workplace", "local de trabalho"],
  ["angry", "zangado"], ["customer", "cliente"], ["colleague", "colega"], ["deadline", "prazo"],
  ["project", "projeto"], ["task", "tarefa"], ["goal", "objetivo"], ["goals", "objetivos"],
  ["time", "tempo"], ["words", "palavras"], ["tone", "tom"], ["intent", "intenção"],
  ["impact", "impacto"], ["result", "resultado"], ["results", "resultados"], ["complete", "concluir"],
  ["start", "começar"], ["finish", "terminar"], ["why", "porquê"], ["what", "o que"], ["how", "como"],
  ["when", "quando"], ["true", "verdadeiro"], ["false", "falso"], ["the", "o"], ["and", "e"],
  ["with", "com"], ["without", "sem"], ["for", "para"], ["from", "de"], ["your", "o seu"], ["their", "o seu"],
  ["this", "isto"], ["that", "isso"], ["people", "pessoas"], ["person", "pessoa"], ["way", "forma"],
  ["new", "novo"], ["best", "melhor"], ["most", "mais"], ["very", "muito"], ["also", "também"],
  ["about", "sobre"], ["into", "em"], ["can", "pode"], ["should", "deve"], ["will", "irá"],
  ["have", "ter"], ["make", "fazer"], ["take", "tomar"], ["give", "dar"], ["work", "trabalho"],
  ["working", "a trabalhar"], ["talk", "falar"], ["talking", "a falar"], ["ask", "perguntar"],
  ["asking", "a perguntar"], ["respond", "responder"], ["pause", "pausa"], ["silence", "silêncio"],
  ["interrupt", "interromper"], ["interrupting", "a interromper"], ["assumptions", "suposições"],
  ["assume", "supor"], ["clarify", "clarificar"], ["paraphrase", "parafrasear"], ["summarize", "resumir"],
  ["acknowledge", "reconhecer"], ["defensive", "defensivo"], ["blame", "culpa"], ["praise", "elogio"],
  ["specific", "específico"], ["actionable", "acionável"], ["timely", "oportuno"], ["private", "privado"],
  ["public", "público"], ["focus", "concentre-se"], ["stay", "mantenha-se"], ["keep", "mantenha"],
  ["use", "use"], ["using", "a usar"], ["try", "experimente"], ["choose", "escolha"], ["option", "opção"],
  ["options", "opções"], ["choice", "escolha"], ["choices", "escolhas"], ["consequence", "consequência"],
  ["consequences", "consequências"], ["outcome", "resultado"], ["outcomes", "resultados"],
  ["continue", "continuar"], ["replay", "repetir"], ["hidden", "oculto"], ["reveal", "revelar"],
  ["flip", "vire"], ["card", "cartão"], ["cards", "cartões"], ["step", "passo"], ["steps", "passos"],
  ["process", "processo"], ["checklist", "lista de verificação"], ["key", "chave"], ["point", "ponto"],
  ["idea", "ideia"], ["ideas", "ideias"], ["content", "conteúdo"], ["section", "secção"],
  ["chapter", "capítulo"], ["title", "título"], ["description", "descrição"], ["audience", "público"],
  ["duration", "duração"], ["minutes", "minutos"], ["seconds", "segundos"], ["language", "idioma"],
  ["certificate", "certificado"], ["completion", "conclusão"], ["score", "pontuação"],
  ["passed", "aprovado"], ["failed", "não aprovado"], ["attempt", "tentativa"], ["attempts", "tentativas"],
  ["welcome", "bem-vindo"], ["hello", "olá"], ["thank you", "obrigado"], ["please", "por favor"],
  ["great", "excelente"], ["good", "bom"], ["bad", "mau"], ["important", "importante"],
  ["attention", "atenção"], ["understanding", "compreensão"], ["misunderstanding", "mal-entendido"],
  ["conflict", "conflito"], ["resolve", "resolver"], ["approach", "abordagem"], ["strategy", "estratégia"],
  ["technique", "técnica"], ["techniques", "técnicas"], ["principle", "princípio"], ["principles", "princípios"],
  ["habit", "hábito"], ["habits", "hábitos"], ["everyday", "quotidiano"], ["daily", "diário"],
  ["often", "frequentemente"], ["usually", "normalmente"], ["sometimes", "às vezes"], ["instead", "em vez disso"],
  ["however", "no entanto"], ["because", "porque"], ["therefore", "portanto"], ["so that", "para que"],
  ["in order to", "para"], ["as well as", "bem como"], ["such as", "como"], ["for example", "por exemplo"],
  ["in fact", "de facto"], ["on the other hand", "por outro lado"], ["at the end", "no final"],
  ["at the beginning", "no início"], ["in this lesson", "nesta lição"], ["in this module", "neste módulo"],
  ["you will learn", "irá aprender"], ["you will be able to", "será capaz de"], ["by the end", "no final"],
  ["the most", "o mais"], ["one of the", "um dos"], ["each other", "uns aos outros"],
];

const DICTS: Record<string, Dict> = { es: ES, "pt-PT": PT };

/* ---------- text translation ---------- */
const PROTECT = /\{[^}]*\}|https?:\/\/\S+|\b\d+(?:[.,]\d+)?%?/g;

export function translateText(text: string, lang: string): string {
  const dict = DICTS[lang];
  if (!dict || !text) return text;
  const protectedParts: string[] = [];
  let s = text.replace(PROTECT, (m) => { protectedParts.push(m); return `\u0001${protectedParts.length - 1}\u0001`; });
  for (const [en, tr] of dict) {
    const rx = new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    s = s.replace(rx, (match) => {
      const cap = match[0] === match[0].toUpperCase() && match[0] !== match[0].toLowerCase();
      return cap ? tr.charAt(0).toUpperCase() + tr.slice(1) : tr;
    });
  }
  s = s.replace(/\u0001(\d+)\u0001/g, (_, i) => protectedParts[+i]);
  return s;
}

function translateQuestion(q: Question, lang: string): Question {
  const n = structuredClone(q);
  n.prompt = translateText(q.prompt, lang);
  if (q.options) n.options = q.options.map((o) => translateText(o, lang));
  if (q.explanation) n.explanation = translateText(q.explanation, lang);
  if (q.type === "fill" && q.answer) n.answer = translateText(q.answer, lang);
  return n;
}

function translateBlock(b: Block, lang: string): Block {
  const n: Block = structuredClone(b);
  const t = (s: string) => translateText(s, lang);
  switch (n.kind) {
    case "heading": n.text = t(n.text); break;
    case "text": n.paragraphs = n.paragraphs.map(t); break;
    case "quote": n.text = t(n.text); if (n.attribution) n.attribution = t(n.attribution); break;
    case "callout": n.title = t(n.title); n.body = t(n.body); break;
    case "image": if (n.caption) n.caption = t(n.caption); if (n.alt) n.alt = t(n.alt); break;
    case "video": if (n.caption) n.caption = t(n.caption); if (n.transcript) n.transcript = t(n.transcript); break;
    case "keyPoints": n.title = t(n.title); n.points = n.points.map((p) => ({ title: t(p.title), body: t(p.body) })); break;
    case "accordion": n.items = n.items.map((i) => ({ title: t(i.title), body: t(i.body) })); break;
    case "tabs": n.tabs = n.tabs.map((x) => ({ label: t(x.label), body: t(x.body) })); break;
    case "flipcards": if (n.prompt) n.prompt = t(n.prompt); n.cards = n.cards.map((c) => ({ front: t(c.front), back: t(c.back) })); break;
    case "timeline": if (n.title) n.title = t(n.title); n.items = n.items.map((i) => ({ title: t(i.title), body: t(i.body) })); break;
    case "reveal": n.prompt = t(n.prompt); n.body = t(n.body); break;
    case "checklist": n.title = t(n.title); n.items = n.items.map(t); break;
    case "scenario":
      n.title = t(n.title); n.intro = t(n.intro); n.summary = t(n.summary);
      n.steps = n.steps.map((s) => ({ ...s, situation: t(s.situation), character: t(s.character), choices: s.choices.map((c) => ({ ...c, text: t(c.text), feedback: t(c.feedback) })) }));
      break;
    case "question": n.q = translateQuestion(n.q, lang); break;
    case "quiz": n.title = t(n.title); n.questions = n.questions.map((q) => translateQuestion(q, lang)); break;
    default: break;
  }
  return n;
}

/* Counts translatable strings — shown before the user commits. */
export function countWords(c: Course): number {
  const acc: string[] = [c.title, c.description, ...c.objectives];
  for (const m of c.modules) {
    acc.push(m.title, m.description);
    for (const l of m.lessons) {
      acc.push(l.title);
      for (const b of l.blocks) {
        if (b.kind === "text") acc.push(...b.paragraphs);
        else if (b.kind === "heading" || b.kind === "quote") acc.push((b as { text: string }).text);
        else if (b.kind === "reveal") acc.push(b.body);
        else if (b.kind === "callout") acc.push(b.title, b.body);
        else if (b.kind === "quiz") acc.push(b.title, ...b.questions.flatMap((q) => [q.prompt, q.explanation || "", ...(q.options || [])]));
        else if (b.kind === "question") acc.push(b.q.prompt, b.q.explanation || "", ...(b.q.options || []));
        else if (b.kind === "scenario") acc.push(b.title, b.intro, b.summary, ...b.steps.flatMap((s) => [s.situation, ...s.choices.map((ch) => ch.text + " " + ch.feedback)]));
        else if (b.kind === "keyPoints") acc.push(...b.points.map((p) => p.title + " " + p.body));
        else if (b.kind === "accordion") acc.push(...b.items.map((i) => i.title + " " + i.body));
        else if (b.kind === "tabs") acc.push(...b.tabs.map((x) => x.label + " " + x.body));
        else if (b.kind === "flipcards") acc.push(...b.cards.map((x) => x.front + " " + x.back));
        else if (b.kind === "timeline") acc.push(...b.items.map((i) => i.title + " " + i.body));
        else if (b.kind === "checklist") acc.push(...b.items);
      }
    }
  }
  return acc.filter(Boolean).join(" ").split(/\s+/).length;
}

/* The main entry: duplicate + translate. Never touches the original. */
export function translateCourse(course: Course, lang: string): Course {
  const target = TRANSLATION_TARGETS.find((t) => t.code === lang);
  const clone: Course = structuredClone(course);
  clone.id = uid();
  clone.title = `${translateText(course.title, lang)} (${lang.toUpperCase()})`;
  clone.description = translateText(course.description, lang);
  clone.topic = translateText(course.topic, lang);
  clone.audience = translateText(course.audience, lang);
  clone.objectives = course.objectives.map((o) => translateText(o, lang));
  clone.status = "draft";
  clone.comments = [];
  clone.createdAt = Date.now();
  clone.updatedAt = Date.now();
  clone.settings.language = lang;
  clone.modules = course.modules.map((m) => ({
    ...structuredClone(m),
    title: translateText(m.title, lang),
    description: translateText(m.description, lang),
    lessons: m.lessons.map((l) => ({ ...structuredClone(l), title: translateText(l.title, lang), blocks: l.blocks.map((b) => translateBlock(b, lang)) })),
  }));
  void target;
  return clone;
}
