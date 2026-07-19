import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { textToTipTapDoc } from "@/lib/fileParser";

const ALLOWED_EXTENSIONS = [".txt", ".md"];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB — generous for plain text/markdown notes

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: "No file was uploaded." },
      { status: 400 }
    );
  }

  const lowerName = file.name.toLowerCase();
  const ext = ALLOWED_EXTENSIONS.find((e) => lowerName.endsWith(e));
  if (!ext) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. DocFlow only supports .txt and .md files.",
      },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File is too large. Max size is 1MB." },
      { status: 400 }
    );
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json(
      { error: "Couldn't read the file. Make sure it's a plain text file." },
      { status: 400 }
    );
  }

  const title =
    file.name.replace(/\.(txt|md)$/i, "").trim().slice(0, 200) || "Untitled";

  const tiptapDoc = textToTipTapDoc(text, ext === ".md");

  const doc = await prisma.document.create({
    data: {
      title,
      content: JSON.stringify(tiptapDoc),
      ownerId: user.id,
    },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
