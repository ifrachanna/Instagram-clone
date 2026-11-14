export interface IUser {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  avatar: string;
  bio?: string;
  website?: string;
  followers: string[];
  following: string[];
  savedPosts: string[];
  isVerified?: boolean;
  createdAt: string;
}

export interface IMediaItem {
  url: string;
  publicId?: string;
  mediaType: 'image' | 'video';
}

export interface IPost {
  _id: string;
  caption: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  media?: IMediaItem[];
  author: IUser;
  likes: string[];
  commentsCount: number;
  tags?: string[];
  location?: string;
  isAiFlagged?: boolean;
  createdAt: string;
}

export interface IComment {
  _id: string;
  post: string;
  author: IUser;
  text: string;
  likes: string[];
  createdAt: string;
}

export interface IMessage {
  _id: string;
  conversation?: string | any;
  conversationId?: string;
  sender: IUser | any;
  text: string;
  mediaUrl?: string;
  mediaType?: 'none' | 'image' | 'video';
  readBy?: string[];
  createdAt: string;
}
