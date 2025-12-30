import {
  CodeBlock,
  CodeInline,
  dracula,
  Heading,
  Img,
  type LinkProps,
  type PrismLanguage,
  Tailwind,
  Text,
  type TextProps,
  Link,
  Section,
  Head,
} from "@react-email/components"
import type { ReactNode } from "react"

type Author = {
  name: string
  role: string
  signatureName: string
}

type SocialMedia = {
  url: string
  _title: string
  image?: {
    url: string
  }
}

type RichTextContent = Array<{
  type: string
  attrs?: Record<string, unknown>
  content?: Array<{
    type: string
    text?: string
    marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  }>
}>

type RichTextBlock = {
  __typename: string
  _id: string
  title?: string
  content?: {
    json: {
      content: RichTextContent
    }
  }
}

type NewsletterEmailProps = {
  content: RichTextContent
  blocks: RichTextBlock[]
  author?: Author | null
  socialLinks?: SocialMedia[] | null
  address?: string | null
  unsubscribeLink?: string | null
}

function RichText({
  content,
  blocks,
  components,
}: {
  content: RichTextContent
  blocks?: RichTextBlock[]
  components: Record<string, (props: Record<string, unknown>) => ReactNode>
}) {
  return (
    <>
      {content.map((node, index) => {
        switch (node.type) {
          case "heading":
            const level = (node.attrs?.level as number) || 1
            const HeadingComponent = components[`h${level}`] as (props: { children: ReactNode }) => ReactNode
            if (HeadingComponent) {
              return (
                <HeadingComponent key={index}>{node.content?.map((child, i) => child.text).join("")}</HeadingComponent>
              )
            }
            return null
          case "paragraph":
            const PComponent = components.p as (props: { children: ReactNode }) => ReactNode
            if (PComponent) {
              return (
                <PComponent key={index}>
                  {node.content?.map((child, i) => {
                    if (child.marks?.some((m) => m.type === "bold")) {
                      const BComponent = components.b as (props: { children: ReactNode }) => ReactNode
                      return BComponent ? (
                        <BComponent key={i}>{child.text}</BComponent>
                      ) : (
                        <strong key={i}>{child.text}</strong>
                      )
                    }
                    return child.text
                  })}
                </PComponent>
              )
            }
            return null
          case "image":
            const ImgComponent = components.img as (props: { src: string; alt: string; caption?: string }) => ReactNode
            if (ImgComponent) {
              return (
                <ImgComponent
                  key={index}
                  src={node.attrs?.src as string}
                  alt={(node.attrs?.alt as string) || ""}
                  caption={node.attrs?.caption as string}
                />
              )
            }
            return null
          case "horizontalRule":
            const HrComponent = components.hr as () => ReactNode
            return HrComponent ? <HrComponent key={index} /> : <hr key={index} />
          case "blockquote":
            const BlockquoteComponent = components.blockquote as (props: { children: ReactNode }) => ReactNode
            if (BlockquoteComponent && node.content) {
              return (
                <BlockquoteComponent key={index}>
                  {node.content.map((child, i) => {
                    if (child.type === "paragraph") {
                      return (
                        <p key={i}>
                          {(
                            child as unknown as { content: Array<{ text?: string; marks?: Array<{ type: string }> }> }
                          ).content?.map((c, j) => {
                            if (c.marks?.some((m) => m.type === "bold")) {
                              return <strong key={j}>{c.text}</strong>
                            }
                            return c.text
                          })}
                        </p>
                      )
                    }
                    return null
                  })}
                </BlockquoteComponent>
              )
            }
            return null
          case "basehub-block":
            const block = blocks?.find((b) => b._id === node.attrs?.id)
            if (block && block.__typename === "CalloutBoxComponent") {
              const CalloutComponent = components.CalloutBoxComponent as (props: {
                title: string
                content: RichTextBlock["content"]
              }) => ReactNode
              if (CalloutComponent) {
                return <CalloutComponent key={index} title={block.title || ""} content={block.content!} />
              }
            }
            return null
          default:
            return null
        }
      })}
    </>
  )
}

function NewsletterEmail({ content, blocks, author, socialLinks, address, unsubscribeLink }: NewsletterEmailProps) {
  return (
    <Tailwind>
      <Head>
        <style>
          {`
          ul li p,
          ol li p {
             margin-bottom: 12px !important; 
            }

          blackquote p {
            margin-block: 12px !important; 
          }
         `}
        </style>
      </Head>
      <div className="max-w-screen-md mx-auto py-8 px-2 gap-8">
        <RichText
          content={content}
          blocks={blocks}
          components={{
            ...defaultComponents,
            CalloutBoxComponent: ({ title, content }: { title: string; content: RichTextBlock["content"] }) => (
              <div className="rounded-xl p-6 mb-8 bg-gray-50">
                <h2 className="text-2xl font-medium mb-4">{title}</h2>
                <RichText content={content?.json.content || []} components={defaultComponents} />
              </div>
            ),
          }}
        />
        <Hr />
        <div>
          {author && (
            <>
              <div className="">
                <p className='font-["Brush_Script_MT",_"Brush_Script_Std",_cursive] text-3xl text-[#1C2024] mb-0 mt-0'>
                  {author.signatureName}
                </p>
                <p className="eading-relaxed font-[Helvetica,_'ui-sans-serif'] text-base font-medium mt-0 !text-xs text-[#1C2024]">
                  {author.name}, {author.role}
                </p>
              </div>
              <Hr />
            </>
          )}
          {socialLinks && (
            <Section
              style={{
                textAlign: "left",
                padding: 0,
                margin: 0,
                marginBottom: 16,
              }}
            >
              {socialLinks
                ?.filter((item) => item.image)
                .map((item) => (
                  <Link
                    key={item.url}
                    href={item.url}
                    style={{
                      display: "inline-block",
                      backgroundColor: "#F0F0F3",
                      borderRadius: "50%",
                      width: 32,
                      height: 32,
                      marginRight: 16,
                      textDecoration: "none",
                      lineHeight: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "table",
                        width: "100%",
                        height: "100%",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "table-cell",
                          verticalAlign: "middle",
                          padding: 0,
                          margin: 0,
                        }}
                      >
                        <Img
                          src={item.image?.url}
                          alt={item._title || "Social icon"}
                          width={16}
                          height={16}
                          style={{
                            display: "inline-block",
                            margin: "0 auto",
                            outline: "none",
                            border: "none",
                            lineHeight: 0,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))}
            </Section>
          )}
          {unsubscribeLink && (
            <p className="text-xs text-[#60646C] mb-4 eading-relaxed font-[Helvetica,_'ui-sans-serif'] mt-0">
              <A href={unsubscribeLink}>Unsubscribe</A> from these emails.
            </p>
          )}
          <pre className="text-sm font-[Helvetica,_'ui-sans-serif'] !text-[#B9BBC6] block">{address}</pre>
        </div>
      </div>
    </Tailwind>
  )
}

NewsletterEmail.PreviewProps = {
  content: [
    {
      type: "image",
      attrs: {
        src: "/placeholder.svg?height=528&width=1040&query=newsletter+hero+image",
        alt: "",
        width: 1040,
        height: 528,
        aspectRatio: "65/33",
      },
    },
    {
      type: "heading",
      attrs: {
        level: 2,
        id: "design--development-the-perfect-recipe-for-product-success",
      },
      content: [
        {
          type: "text",
          text: "Design + Development: The Perfect Recipe for Product Success",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Combining design and development isn't just a trend—it's a proven approach to creating impactful, user-focused products. Let's dive into the synergy of design and development to uncover how this powerful duo drives success.",
        },
      ],
    },
    {
      type: "horizontalRule",
    },
    {
      type: "heading",
      attrs: {
        level: 3,
        id: "1-why-collaboration-matters",
      },
      content: [
        {
          type: "text",
          text: "1. Why Collaboration Matters",
        },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "When designers and developers work in silos, miscommunication and mismatched priorities are inevitable. Collaboration ensures a shared vision, where design principles meet technical feasibility.",
        },
      ],
    },
    {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Great things in business are never done by one person; they're done by a team of people.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "— Steve Jobs",
              marks: [
                {
                  type: "bold",
                  attrs: {},
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  blocks: [],
  author: {
    name: "John Doe",
    role: "CEO @ Acme Corp",
    signatureName: "J. Doe",
  },
  unsubscribeLink: "#",
  socialLinks: [],
  address: `401 Broadway
New York, NY, 10013`,
}

const Hr = () => <hr className="border-0 border-b border-solid border-[#E8E8EC] my-8" />

const A = (props: LinkProps) => {
  return <Link {...props} className="text-[#60646C] underline" />
}

const P = ({ children }: TextProps) => (
  <Text className="leading-relaxed font-[Helvetica,_'ui-sans-serif'] text-[#60646C] text-base mb-5">{children}</Text>
)

const defaultComponents: Record<string, (props: Record<string, unknown>) => ReactNode> = {
  h1: ({ children }: { children?: ReactNode }) => (
    <Heading as="h1" className="leading-none font-normal text-4xl font-[Georgia,_'ui-serif'] mt-8 mb-2 text-[#1C2024]">
      {children}
    </Heading>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <Heading as="h2" className="leading-none font-normal font-[Georgia,_'ui-serif'] text-2xl mt-8 mb-2 text-[#1C2024]">
      {children}
    </Heading>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <Heading as="h3" className="leading-none font-normal font-[Georgia,_'ui-serif'] text-xl mt-8 mb-2 text-[#1C2024]">
      {children}
    </Heading>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <Heading as="h4" className="leading-none font-normal font-[Georgia,_'ui-serif'] text-xl mt-8 mb-2 text-[#1C2024]">
      {children}
    </Heading>
  ),
  p: P,
  pre: ({ code, language }: { code?: string; language?: string }) => {
    return (
      <CodeBlock
        code={code || ""}
        fontFamily="'CommitMono', monospace"
        language={(language as PrismLanguage) || "javascript"}
        theme={dracula}
      />
    )
  },
  code: ({ children }: { children?: ReactNode }) => <CodeInline className="mb-5">{children}</CodeInline>,
  img: ({ src, alt, caption }: { src?: string; alt?: string; caption?: string }) => (
    <figure className="mb-5 mx-0">
      <Img src={src} alt={alt || ""} className="rounded-xl w-full object-cover mb-2 mx-0" />
      {caption && (
        <figcaption className="text-[#8B8D98] text-sm text-center mx-auto font-[Helvetica,_'ui-sans-serif']">
          {caption}
        </figcaption>
      )}
    </figure>
  ),
  b: ({ children, ...props }: { children?: ReactNode }) => (
    <strong {...props} className="font-medium text-[#80838D]">
      {children}
    </strong>
  ),
  blockquote: ({ children, ...props }: { children?: ReactNode }) => (
    <blockquote {...props} className="border-0 pl-3 ml-0 border-l-4 border-solid border-[#E8E8EC] [&>b]:text-xs">
      {children}
    </blockquote>
  ),
  a: A as unknown as (props: Record<string, unknown>) => ReactNode,
  hr: Hr,
}

export default NewsletterEmail
