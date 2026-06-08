import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { config } from "@/lib/config"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(config.googleClientId && config.googleClientSecret
      ? [
          Google({
            clientId: config.googleClientId,
            clientSecret: config.googleClientSecret,
          }),
        ]
      : []),
    Credentials({
      name: "Dev",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null
        const email = credentials.email as string
        const name = (credentials.name as string) || email.split("@")[0]

        let user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.user.create({
            data: { email, name },
          })
        }
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
  session: { strategy: "jwt" },
})
