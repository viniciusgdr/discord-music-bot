import axios, { AxiosRequestConfig } from 'axios';
import * as qs from 'qs';

interface Y2MateSearch {
  keyword: string;
  page: string;
  status: string;
  vitems: Vitens[];
}

export interface Vitens {
  t: string;
  v: string;
}

export class VitensClass {
  title: string;
  v: string;

  constructor({ t, v }: Vitens) {
    this.title = t;
    this.v = v;
  }

  getUrl(): string {
    return `https://www.youtube.com/watch?v=${this.v}`;
  }
}

const headers = {
  "accept": "/",
  "accept-language": "pt-BR,pt;q=0.7",
  "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
  "cookie": "cf_clearance=aJnORA9OEt9wrGbeH945.vQvrFxwM_VtJIX9AQwCC0E-1723844353-1.2.1.1-vpPQtRmK0Ny3BnvfCS8vyJo5zZ3RJG87k>",
  "origin": "https://www.y2mate.com",
  "priority": "u=1, i",
  "sec-ch-ua": '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-model": "",
  "sec-ch-ua-platform": "Linux",
  "sec-ch-ua-platform-version": "6.6.44",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
  "sec-gpc": "1",
  "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
  "x-requested-with": "XMLHttpRequest",
}

interface InfoY2Mate {
  a: string;
  extractor: string;
  vid: string;
  title: string;
  t: number;
  links: {
    mp3: Record<string, any> | null;
    mp4: Record<string, any> | null;
    other: Record<string, any> | null;
  };
}

interface ContentVideoY2Mate {
  f: string;
  k: string;
  q: string;
  q_text: string;
  size: string;
}

interface ResultURLY2Mate {
  c_status: string;
  dlink: string;
  fquality: string;
  ftype: string;
  title: string;
  vid: string;
}

export class InfoY2MateClass {
  channel: string;
  extractor: string;
  vid: string;
  title: string;
  seconds: number;
  links: {
    mp3: Record<string, any> | null;
    mp4: Record<string, any> | null;
    other: Record<string, any> | null;
  };

  constructor(info: InfoY2Mate) {
    this.channel = info.a;
    this.extractor = info.extractor;
    this.vid = info.vid;
    this.title = info.title;
    this.seconds = info.t;
    this.links = info.links;
  }

  async getUrl(content: ContentVideoY2Mate): Promise<string> {
    const data = qs.stringify({
      vid: this.vid,
      k: content.k
    });

    const config: AxiosRequestConfig = {
      method: 'post',
      url: 'https://www.y2mate.com/mates/convertV2/index',
      headers,
      data: data,
    };

    try {
      const response = await axios(config);
      const resultURLY2Mate: ResultURLY2Mate = response.data;
      return resultURLY2Mate.dlink;
    } catch (error: any) {
      throw new Error(error);
    }
  }

  getHighAudio(): ContentVideoY2Mate | null {
    const mp3 = this.links.mp3;

    if (!mp3) return null;

    const qualities = ['320', '256', '192', '140', '128', 'mp3128', '64'];

    for (const q of qualities) {
      if (mp3[q]) {
        const data = mp3[q];
        return {
          f: data.f,
          k: data.k,
          q: q,
          q_text: data.q_text,
          size: data.size,
        };
      }
    }

    return null;
  }

  getHighVideo(): ContentVideoY2Mate | null {
    const mp4 = this.links.mp4;

    if (!mp4) return null;

    const qualities = ['137', '136', '135', '134', '133', '160', '18'];
    const qualityNames: Record<string, string> = {
      '137': '1080p',
      '136': '720p',
      '135': '480p',
      '134': '360p',
      '133': '240p',
      '160': '144p',
      '18': '144p',
    };

    for (const q of qualities) {
      if (mp4[q]) {
        const data = mp4[q];
        return {
          f: data.f,
          k: data.k,
          q: qualityNames[q],
          q_text: data.q_text,
          size: data.size,
        };
      }
    }

    return null;
  }
}

export async function getVideoInfoY2Mate(item: VitensClass): Promise<InfoY2MateClass> {
  const data = qs.stringify({
    k_query: item.getUrl(),
    k_page: 'mp3',
    hl: 'en',
    q_auto: '1',
  });

  const config: AxiosRequestConfig = {
    method: 'post',
    url: 'https://www.y2mate.com/mates/analyzeV2/ajax',
    headers,
    data: data,
  };

  try {
    const response = await axios(config);
    return new InfoY2MateClass(response.data);
  } catch (error: any) {
    throw new Error(error);
  }
}

export async function searchY2Mate(query: string): Promise<Y2MateSearch> {
  const data = qs.stringify({
    k_query: query,
    k_page: 'home',
    hl: 'en',
    q_auto: '0',
  });

  const config: AxiosRequestConfig = {
    method: 'post',
    url: 'https://www.y2mate.com/mates/analyzeV2/ajax',
    headers,
    data: data,
  };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error: any) {
    throw new Error(error);
  }
}
