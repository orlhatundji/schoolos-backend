export class Repository<
  T extends { id: string },
  TDelegate extends {
    create: (args: any) => Promise<T>;
    findUnique: (args: any) => Promise<T | null>;
    findFirst: (args: any) => Promise<T | null>;
    findMany: (args: any) => Promise<T[]>;
    update?: (args: { where: any; data: any }) => Promise<T>;
    delete?: (args: { where: any }) => Promise<T>;
  },
  TWhereInput,
  TWhereUniqueInput,
  TCreateInput,
  TUpdateInput,
  TIncludeInput,
> {
  constructor(protected readonly model: TDelegate) {}

  async create(data: TCreateInput, params?: { include?: TIncludeInput }): Promise<T> {
    return this.model.create({ data, include: params?.include }) as Promise<T>;
  }

  async findById(id: string, params?: { include?: TIncludeInput }): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include: params?.include,
    }) as Promise<T | null>;
  }

  async findOne(params: { where: TWhereInput; include?: TIncludeInput }): Promise<T | null> {
    return this.model.findFirst({
      where: params.where,
      include: params?.include,
    }) as Promise<T | null>;
  }

  async findAll(params?: {
    where?: TWhereInput;
    include?: TIncludeInput;
    orderBy?: any;
    take?: number;
  }): Promise<T[]> {
    return this.model.findMany({
      where: params?.where,
      include: params?.include,
      orderBy: params?.orderBy,
      take: params?.take,
    }) as Promise<T[]>;
  }

  async update(where: TWhereInput, data: TUpdateInput): Promise<T> {
    return this.model.update({ where, data });
  }

  async delete(where: TWhereUniqueInput): Promise<T> {
    return this.model.delete({ where });
  }
}
