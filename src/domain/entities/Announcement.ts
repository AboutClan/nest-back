export interface AnnouncementProps {
  id?: string;
  type: string;
  title: string;
  content: string;
}

export class Announcement {
  public id: string;
  public type: string;
  public title: string;
  public content: string;

  constructor(props: AnnouncementProps) {
    this.id = props.id || null;
    this.type = props.type || null;
    this.title = props.title || null;
    this.content = props.content || null;
  }

  toPrimitives(): AnnouncementProps {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      content: this.content,
    };
  }
}
