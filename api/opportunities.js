const { MongoClient } = require("mongodb");

const MONGODB_URI = "mongodb+srv://yuvaraj:Yc7aNShY2Cpbj5D2@shareos.ekz2onb.mongodb.net/?retryWrites=true&w=majority&appName=shareos";

module.exports = async (req, res) => {
  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db("shareos");

    const opportunities = await db.collection("sbir_opportunities")
      .find({})
      .sort({ relevance_score: -1 })
      .toArray();

    const latestScan = await db.collection("sbir_scans")
      .find({})
      .sort({ scanned_at: -1 })
      .limit(1)
      .toArray();

    const scan = latestScan[0] || {};
    const high = opportunities.filter(o => (o.relevance_score || 0) >= 50).length;
    const medium = opportunities.filter(o => (o.relevance_score || 0) >= 30 && (o.relevance_score || 0) < 50).length;
    const openDeadlines = opportunities.filter(o => {
      if (!o.close_date) return false;
      return new Date(o.close_date) > new Date();
    }).length;

    res.json({
      opportunities: opportunities.map(o => ({
        id: o.id || o._id?.toString(),
        title: o.title || (o.description || "").substring(0, 100) || "Untitled",
        description: o.description || "",
        component: o.component || "DOD",
        relevance_score: o.relevance_score || 0,
        status: o.status || o.application_status || "open",
        open_date: o.open_date || null,
        close_date: o.close_date || null,
        tech_areas: o.tech_areas || [],
        source: o.source || "SBIR",
        matched_ventures: o.matched_ventures || [],
        matched_verticals: o.matched_verticals || [],
        proposal_draft_status: o.proposal_draft_status || null,
      })),
      summary: { total: opportunities.length, high, medium, openDeadlines },
      lastScanned: scan.scanned_at || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (client) await client.close();
  }
};
