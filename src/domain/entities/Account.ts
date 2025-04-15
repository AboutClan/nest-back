export interface AccountProps {
  provider: string;
  type: string;
  providerAccountId: string;
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  refresh_token_expires_in: number;
  userId: string;
}

export class Account {
  private props: AccountProps;

  constructor(props: AccountProps) {
    this.props = props;
    // 도메인 검증 로직을 추가할 수 있습니다.
  }

  get provider(): string {
    return this.props.provider;
  }

  set provider(value: string) {
    // 필요 시 도메인 검증 가능
    this.props.provider = value;
  }

  get type(): string {
    return this.props.type;
  }

  set type(value: string) {
    this.props.type = value;
  }

  get providerAccountId(): string {
    return this.props.providerAccountId;
  }

  set providerAccountId(value: string) {
    this.props.providerAccountId = value;
  }

  get access_token(): string {
    return this.props.access_token;
  }

  set access_token(value: string) {
    this.props.access_token = value;
  }

  get token_type(): string {
    return this.props.token_type;
  }

  set token_type(value: string) {
    this.props.token_type = value;
  }

  get refresh_token(): string {
    return this.props.refresh_token;
  }

  set refresh_token(value: string) {
    this.props.refresh_token = value;
  }

  get expires_at(): number {
    return this.props.expires_at;
  }

  set expires_at(value: number) {
    this.props.expires_at = value;
  }

  get scope(): string {
    return this.props.scope;
  }

  set scope(value: string) {
    this.props.scope = value;
  }

  get refresh_token_expires_in(): number {
    return this.props.refresh_token_expires_in;
  }

  set refresh_token_expires_in(value: number) {
    this.props.refresh_token_expires_in = value;
  }

  get userId(): string {
    return this.props.userId;
  }

  set userId(value: string) {
    this.props.userId = value;
  }
}
