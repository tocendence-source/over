export type ArtworkId = "adapter" | "clan" | "operator" | "shkolodrive";

type ArtworkRecord = {
  file: string;
  local?: string;
  remote: string;
  alt: string;
  caption: string;
};

// Each record points at its final same-origin path. Until the original JPG is
// actually added to public/images/, the <Artwork> fallback chain serves the
// interim public Telegram CDN image instead — never a broken frame. Once the
// four originals are in place, the telesco.pe hosts can be removed from the
// img-src directive and from the remote field kept here for provenance.
export const artwork: Record<ArtworkId, ArtworkRecord> = {
  adapter: {
    file: "over-adapter.jpg",
    local: "/images/over-adapter.jpg",
    remote: "https://cdn5.telesco.pe/file/fLmDoQibopXGweuFmrcKKSBYflSpgsZPUJ-50PAG8AOvsrjUjRF3V-V1OAXv1ZNkzf_5sriLpbwnaR_VR9ggHcrOfyNcPzZpL-VHQiDeUfP4EFstTWqktYuVmu1FnVgQE_474QbIPzCLctcrMD8REDySeYhzsvuun19CQv-pJit8Xt7392PcIHEZfM0g-jYwKMw8jv5I9EmbSJXKWqTjssbxpw7quvqoHockNK_a0q23NqQ5gI0surnQ1RBEt3_ftRpQrmN4PLHlgBvAAmz1FdHlFV0L7kbK6YlIpWTRTB352sTZvyZACl7xMRIOv7rdQ95JZOigPaD0uo-THxBI9w.jpg",
    alt: "OVER Adapter's public channel artwork",
    caption: "OVER Adapter / Community infrastructure",
  },
  clan: {
    file: "over-clan.jpg",
    local: "/images/over-clan.jpg",
    remote: "https://cdn5.telesco.pe/file/BUHxPm9Sf4Ur_blKpLXbFFEBhJBmzD0iLR6Uav8x_SDG-suf4qpSuVQ_I0pZLqhRYhMcV-bPRuX6s3x7SrwO0e5nsy0YZ5kcVswwhmxD6LXvOqALjw5LJE3KOpV0-0MKajx_xSqk6EvOHzFgmqaMNGhImKSMsdSqZHiPmY_84WDGzHkHzWzwtQNhHaoa_-md6SfH7s_0lSAlHbEh5_gWfoXWch_OqTpLSSgKIaIQciYlQMbFk9FDmv7lWAZSOigHT8KebAc2q7L94QC8HoU_GjnFfvZOKdJHqfARfOANIq15NpETLxO1FWGnecsbtbdO3deMZJMCrN2h2pkaNFNhBw.jpg",
    alt: "The OVER community's public channel artwork",
    caption: "OVER Clan / Research community",
  },
  operator: {
    file: "new-over.jpg",
    local: "/images/new-over.jpg",
    remote: "https://cdn4.telesco.pe/file/V6SIab9RskvaajwyasnNHMR3RM1wTuFbchZ2SM1WhHDxS15ebZo1FncBRgFsEXzeySudprl-AhVFkeSiAHkgxCWL-HHJgK_tm_CKVX2FQvTGR_quBElWs5DFiBjxUfpAuAWz19-zE31mfAaEM98bNdzxeXBKtKDu0t1KOEVfz6vf6FM-lpHfcf6ZakC89rretZmEsSD5-piGSH1WAmSQQBv8_xgQKyrN5qaHU58pEHJftif0ObUrnqo_Pjsw_PnhnR40Tjj8FJiAa8hvh75RvIZ5ZYs_GAOjFd3w422v7qE9Ybgi_B6w9FmwvTbKa-6yXTGcaSxWcPTXt6C8QHw7_w.jpg",
    alt: "New_Over's public Telegram avatar",
    caption: "New_Over / Personal avatar",
  },
  shkolodrive: {
    file: "shkolodrive.jpg",
    local: "/images/shkolodrive.jpg",
    remote: "https://cdn4.telesco.pe/file/vWyvcZGuqn8UqLyRZaDn_VvPvdP4SyJmLSyzxoab-f5bLoZMVtN4UKB7YVpKzfUdBUW3FRaePT7eNSjBny9DZF-6cMKWNPC4erpBUFMcPWmBXCy9Ej8V5d--V48EwTp_WJVqo6KtOnAFcOV7OBc6lTzd3_7urG7Zwy8R-rK-tYfjWpNpCpfxniQNBmZEfXJ0m1hsVjJ4PFbUZ_IAxjMuu53UJHflLP2Ong2HbSyZOn8da7pwqhJ3nLmidhkB-nPDTF2ronrAZwgBLjuuF1M2oI62eyUDGFbYpI2t3obipSHRdxVIB-o7iuz1zJmFykDINUvntO2PVjEvDwFlONZ_QQ.jpg",
    alt: "ShkoloDrive's public educational channel artwork",
    caption: "ShkoloDrive / Practical OSINT education",
  },
};