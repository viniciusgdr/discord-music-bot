type Video = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelTitle: string;
  videoId: string;
  thumbnails: {
    default: { url: string; width: number; height: number };
    medium: { url: string; width: number; height: number };
    high: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
    maxres?: { url: string; width: number; height: number };
  };
}

export const isPlaylist = (url: string) => {
  return url.includes('list=');
}

export const getPlaylistId = (url: string) => {
  const urlParams = new URLSearchParams(url);
  return urlParams.get('list');
}

const extractVideos = (data: any): Video[] => {
  const items = data.items.map((item: any) => {
    const snippet = item.snippet;
    return {
      id: item.id,
      title: snippet.title,
      description: snippet.description,
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
      videoId: snippet.resourceId.videoId,
      thumbnails: snippet.thumbnails,
    };
  });

  const verifiedItems = items.filter((item: any) => item.videoId && item.title && item.title !== 'Deleted video');
  return verifiedItems;
};

export const fetchPlaylistVideos = async (playlistId: string) => {
  const videos: Video[] = [];
  let nextPageToken = null;

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${process.env.YOUTUBE_APIKEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.items) {
      videos.push(...extractVideos(data));
    }

    nextPageToken = data.nextPageToken;

    if (!nextPageToken) {
      break;
    }

    if (data.pageInfo.totalResults === videos.length) {
      break;
    }

    if (videos.length >= 100) {
      break;
    }
  } while (nextPageToken);

  return videos;
};

