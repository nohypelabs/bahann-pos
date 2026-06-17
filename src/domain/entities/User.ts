export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly name: string,
    public readonly passwordHash: string,
    public readonly outletId?: string,
    public readonly role?: string,
    public readonly tenantId?: string,
    public readonly createdAt?: Date,
    public readonly whatsappNumber?: string
  ) {}

  static create(props: {
    id?: string
    email: string
    name: string
    passwordHash: string
    outletId?: string
    role?: string
    tenantId?: string
    whatsappNumber?: string
  }): User {
    return new User(
      props.id || crypto.randomUUID(),
      props.email,
      props.name,
      props.passwordHash,
      props.outletId,
      props.role,
      props.tenantId,
      new Date(),
      props.whatsappNumber
    )
  }
}
