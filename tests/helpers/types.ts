export interface Author {
  id: number;
  firstName: string;
  lastName: string;
  avatar: string;
}

export interface Reply {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
}

export interface Note {
  id: number;
  text: string;
  createdAt: string;
  updatedAt: string;
  author: Author;
  replies: Reply[];
}
