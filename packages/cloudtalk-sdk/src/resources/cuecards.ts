import type { AxiosInstance } from 'axios';

/**
 * CueCards aparecem dentro do softphone do CloudTalk durante a chamada.
 * Ideal pro briefing pré-chamada.
 */
export interface CueCardBlock {
  name: string;
  type: 'text' | 'url' | 'title' | 'separator';
  value: string;
}

export class CueCardsResource {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * Envia um CueCard para a chamada ativa do agente.
   * Precisa ter o `call_uuid` (vem no webhook `call.started`).
   */
  async push(params: { call_uuid: string; type: string; title: string; content: CueCardBlock[] }) {
    const res = await this.http.post('/cue_cards.json', params);
    return res.data;
  }
}
