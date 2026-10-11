export type QuestionKind = 'multiple-choice' | 'short-answer' | 'tracing';
export interface QuizQuestion {
  id: string; type?: QuestionKind; prompt: string; explanation: string;
  answer: string | number | boolean; options?: readonly string[];
  alternatives?: readonly (string | number | boolean)[]; program?: string;
  promptHTML?: string; explanationHTML?: string; optionsHTML?: readonly string[];
}
export interface QuizAttempt {
  revision: string; ids: string[]; index: number;
  responses: Record<string,string>; orders: Record<string,string[]>; complete: boolean;
}
export interface QuizRevisionProof { revision: string; questionIds: readonly string[] }
export interface QuizSpecification { questions: QuizQuestion[]; batchSize: number; revisionProofs?: QuizRevisionProof[] }
export function isRecord(value: unknown): value is Record<string,unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.prompt !== 'string' || typeof value.explanation !== 'string' || !['string','number','boolean'].includes(typeof value.answer)) return false;
  if (value.type === 'multiple-choice' || value.type === undefined) return Array.isArray(value.options) && value.options.length >= 2 && value.options.every(option => typeof option === 'string');
  return value.type === 'short-answer' || value.type === 'tracing';
}
export function readQuizSpecification(raw: string | null): QuizSpecification | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!isRecord(value) || !Array.isArray(value.questions) || !value.questions.length || !value.questions.every(isQuizQuestion) || !Number.isInteger(value.batchSize) || Number(value.batchSize) < 1 || new Set(value.questions.map(q => q.id)).size !== value.questions.length) return null;
    const revisionProofs: QuizRevisionProof[] = [];
    if (Array.isArray(value.revisionProofs)) for (const proof of value.revisionProofs) {
      if (isRecord(proof) && typeof proof.revision === 'string' && Array.isArray(proof.questionIds) && proof.questionIds.every(id => typeof id === 'string') && new Set(proof.questionIds).size === proof.questionIds.length) revisionProofs.push({revision:proof.revision,questionIds:proof.questionIds});
    }
    return { questions: value.questions, batchSize: Number(value.batchSize), revisionProofs };
  } catch { return null; }
}
export function shuffleOrder<T>(items: readonly T[], previous: readonly T[] = [], random: () => number = Math.random): T[] {
  const result = items.slice();
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j]!,result[i]!]; }
  if (result.length>1 && result.every((item,i)=>item===previous[i])) result.push(result.shift()!);
  return result;
}
export function drawBatch<T>(pool: readonly T[], size: number, previous: readonly T[] = [], random: () => number = Math.random): T[] {
  const count=Math.max(0,Math.min(Math.floor(size),pool.length)); if (!count) return [];
  const result=shuffleOrder(pool,[],random).slice(0,count);
  if (pool.length>count && result.every(id=>previous.includes(id))) { const unused=pool.filter(id=>!result.includes(id));result[result.length-1]=unused[Math.floor(random()*unused.length)]!; }
  return shuffleOrder(result,previous,random);
}
export function choiceValues(question: QuizQuestion): string[] {
  return question.type==='short-answer'?[]:question.type==='tracing'?['true','false']:(question.options??[]).map((_option,index)=>String(index));
}
export function normalized(value: unknown): string { return String(value??'').trim().toLowerCase().replace(/\s+/g,' '); }
export function isCorrect(question: QuizQuestion, value: unknown): boolean { return [question.answer,...(question.alternatives??[])].some(answer=>normalized(answer)===normalized(value)); }
export function fingerprint(questions: unknown): string {
  let result=2166136261;for(const char of JSON.stringify(questions)) result=Math.imul(result^char.charCodeAt(0),16777619)>>>0;return result.toString(16);
}
/** An old bank is accepted only when all its ordered question objects still hash exactly as recorded. */
export function restoreAttempt(raw: string | null, questions: readonly QuizQuestion[], size: number, revision: string, proofs: readonly QuizRevisionProof[] = []): QuizAttempt | null {
  try {
    const saved: unknown=JSON.parse(raw??'null');if(!isRecord(saved))return null;
    const byId=new Map(questions.map(question=>[question.id,question]));
    if(!Array.isArray(saved.ids)||saved.ids.length!==size||!saved.ids.every((id):id is string=>typeof id==='string')||new Set(saved.ids).size!==size||saved.ids.some(id=>!byId.has(id))||!Number.isInteger(saved.index)||Number(saved.index)<0||Number(saved.index)>=size)return null;
    if(saved.revision!==revision) {
      const proof=proofs.find(item=>item.revision===saved.revision);if(!proof||!saved.ids.every(id=>proof.questionIds.includes(id)))return null;
      const oldQuestions=proof.questionIds.map(id=>byId.get(id));
      if(oldQuestions.some(question=>!question)||fingerprint(oldQuestions)!==proof.revision)return null;
    }
    const responses: Record<string,string>={},orders: Record<string,string[]>={};
    const savedResponses=isRecord(saved.responses)?saved.responses:{},savedOrders=isRecord(saved.orders)?saved.orders:{};
    for(const id of saved.ids) {
      const question=byId.get(id);if(!question)return null;const choices=choiceValues(question),response=savedResponses[id],order=savedOrders[id];
      if(typeof response==='string'&&response.trim()&&response.length<=320&&(question.type==='short-answer'||choices.includes(response)))responses[id]=response;
      if(Array.isArray(order)&&order.every((item):item is string=>typeof item==='string')&&order.length===choices.length&&new Set(order).size===choices.length&&order.every(item=>choices.includes(item)))orders[id]=order;
    }
    return {revision,ids:saved.ids,index:Number(saved.index),responses,orders,complete:saved.complete===true&&saved.ids.every(id=>Object.hasOwn(responses,id))};
  } catch {return null;}
}
