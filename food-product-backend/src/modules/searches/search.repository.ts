import { prisma } from "../../lib/prisma";

interface SearchRecord {
  id: string;
  query: string;
  createdAt: Date;
}

export const searchRepository = {
  create(userId: string, query: string): Promise<SearchRecord> {
    return prisma.search.create({
      data: { userId, query },
      select: { id: true, query: true, createdAt: true },
    });
  },

  findRecentByUser(userId: string, limit: number): Promise<SearchRecord[]> {
    return prisma.search.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      distinct: ["query"],
      take: limit,
      select: { id: true, query: true, createdAt: true },
    });
  },
};
