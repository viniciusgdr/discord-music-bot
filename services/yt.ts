import axios from 'axios';

interface IYTSearch {
  videoId: string;
  title: string;
  duration: string;
  thumbnail: string;
  url: string;
  embed: string;
}

export async function searchYT(query: string): Promise<IYTSearch[]> {
  const urlStr = 'https://music.youtube.com/youtubei/v1/search?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false';
  const requestBody = {
    context: {
      client: {
        hl: 'pt',
        gl: 'BR',
        clientName: 'WEB',
        clientVersion: '2.20230602.01.00',
      },
    },
    query: query,
  };

  try {
    const response = await axios.post(urlStr, requestBody);
    const data = response.data;

    if (!data.contents ||
        !data.contents.twoColumnSearchResultsRenderer ||
        !data.contents.twoColumnSearchResultsRenderer.primaryContents) {
      throw new Error('not found');
    }

    const resultVideos = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
    let goToResults: any[] = [];

    if (resultVideos.length > 0) {
      const firstItem = resultVideos[0].itemSectionRenderer?.contents ?? [];
      goToResults.push(...firstItem);

      if (resultVideos[1]?.itemSectionRenderer) {
        const secondItem = resultVideos[1].itemSectionRenderer?.contents ?? [];
        goToResults.push(...secondItem);
      }
    }

    const videos: IYTSearch[] = goToResults
      .filter(item => item.videoRenderer)
      .map(item => {
        const videoRenderer = item.videoRenderer;
        const videoId = videoRenderer.videoId as string;
        const title = videoRenderer.title?.runs?.[0]?.text || '';
        const duration = videoRenderer.lengthText?.simpleText || '';

        return {
          videoId: videoId,
          title: title,
          duration: duration,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embed: `https://www.youtube.com/embed/${videoId}`,
        };
      });

    return videos;
  } catch (error: any) {
    throw new Error(`Error searching YouTube: ${error.message}`);
  }
}
