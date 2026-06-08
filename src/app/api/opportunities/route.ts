import { NextResponse } from "next/server";

const MONGODB_URI = "mongodb+srv://yuvaraj:Yc7aNShY2Cpbj5D2@shareos.ekz2onb.mongodb.net/?retryWrites=true&w=majority&appName=shareos";

export async function GET() {
  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("shareos");

    // Get opportunities
    const opportunities: any[] = await db.collection("sbir_opportunities")
      .find({})
      .sort({ relevance_score: -1 })
      .toArray();

    // Get latest scan summary
    const latestScan = await db.collection("sbir_scans")
      .find({})
      .sort({ scanned_at: -1 })
      .limit(1)
      .toArray();

    await client.close();

    const scan: any = latestScan[0] || {};
    const high = opportunities.filter(o => (o.relevance_score || 0) >= 50).length;
    const medium = opportunities.filter(o => (o.relevance_score || 0) >= 30 && (o.relevance_score || 0) < 50).length;
    const openDeadlines = opportunities.filter(o => {
      if (!o.close_date) return false;
      return new Date(o.close_date) > new Date();
    }).length;

    return NextResponse.json({
      opportunities: opportunities.map(o => ({
        id: o.id || o._id?.toString(),
        title: o.title || o.description?.substring(0, 100) || "Untitled",
        description: o.description || "",
        component: o.component || "DOD",
        relevanceScore: o.relevance_score || 0,
        status: o.status || o.application_status || "open",
        openDate: o.open_date || null,
        closeDate: o.close_date || null,
        techAreas: o.tech_areas || [],
        source: o.source || "SBIR",
        matchedVentures: o.matched_ventures || [],
        matchedVerticals: o.matched_verticals || [],
        proposalDraftStatus: o.proposal_draft_status || null,
      })),
      summary: {
        total: opportunities.length,
        high,
        medium,
        openDeadlines,
      },
      lastScanned: scan.scanned_at || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
