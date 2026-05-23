export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  groupIds: string[];
  createdAt: { seconds: number } | Date;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  coverColor: string;
  createdBy: string;
  creatorName: string;
  memberIds: string[];
  inviteCode: string;
  postCount: number;
  createdAt: { seconds: number } | Date;
}

export interface Post {
  id: string;
  groupId: string;
  groupName: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  title: string;
  content: string;
  contentType: "text" | "image" | "file";
  attachments: Attachment[];
  images: string[];
  likeCount: number;
  commentCount: number;
  likedBy: string[];
  createdAt: { seconds: number } | Date;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL?: string;
  content: string;
  createdAt: { seconds: number } | Date;
}

export interface InviteCode {
  code: string;
  used: boolean;
  usedBy?: string;
  createdAt: { seconds: number } | Date;
}
