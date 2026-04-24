import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const READ_OPS = new Set<string>([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

const STUDENT_LINKED_MODELS = new Set<string>([
  'classArmStudent',
  'studentPromotion',
  'studentStatusHistory',
  'studentPayment',
  'resultComment',
  'prefect',
  'classArmStudentAssessment',
]);

function buildLinkedModelExtension() {
  return {
    async $allOperations({
      operation,
      args,
      query,
    }: {
      operation: string;
      args: any;
      query: (args: any) => Promise<any>;
    }) {
      if (READ_OPS.has(operation)) {
        const prevWhere = args.where ?? {};
        const prevStudent = prevWhere.student ?? {};
        args.where = {
          ...prevWhere,
          student: { ...prevStudent, deletedAt: null },
        };
      }
      return query(args);
    },
  };
}

function buildExtended(base: PrismaClient) {
  const linked = Object.fromEntries(
    Array.from(STUDENT_LINKED_MODELS).map((m) => [m, buildLinkedModelExtension()]),
  );
  return base.$extends({
    name: 'softDeleteStudent',
    query: {
      student: {
        async $allOperations({ operation, args, query }) {
          if (READ_OPS.has(operation)) {
            const a = args as any;
            a.where = { ...(a.where ?? {}), deletedAt: null };
          }
          return query(args);
        },
      },
      ...linked,
    },
  });
}

type ExtendedClient = ReturnType<typeof buildExtended>;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly _extended: ExtendedClient;
  public readonly rawPrisma: PrismaClient;

  constructor() {
    super();
    this._extended = buildExtended(this);
    this.rawPrisma = this;

    return new Proxy(this, {
      get(target, prop, receiver) {
        const key = typeof prop === 'string' ? prop : undefined;
        if (key === 'rawPrisma') {
          return target;
        }
        if (key === 'student' || (key && STUDENT_LINKED_MODELS.has(key))) {
          return (target._extended as any)[key];
        }
        const value = Reflect.get(target, prop, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
