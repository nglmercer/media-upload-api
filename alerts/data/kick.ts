//https://kick.com/emotes/:name
//https://kick.com/api/v2/channels/:name
const emotes = [
    {
        "id": 1730752,
        "channel_id": null,
        "name": "emojiAngel",
        "subscribers_only": false
    },
    {
        "id": 1730753,
        "channel_id": null,
        "name": "emojiAngry",
        "subscribers_only": false
    },
]
export const kickEmotes = [
    {
        "id": 6332619,
        "user_id": 6425882,
        "slug": "aquino",
        "is_banned": false,
        "playback_url": "https:\/\/fa723fc1b171.us-west-2.playback.live-video.net\/api\/video\/v1\/us-west-2.196233775518.channel.ON5upknmcA1c.m3u8",
        "name_updated_at": null,
        "vod_enabled": true,
        "subscription_enabled": true,
        "is_affiliate": true,
        "emotes": emotes,
        "can_host": true,
        "user": {
            "id": 6425882,
            "username": "AQUINO",
            "agreed_to_terms": true,
            "email_verified_at": "2023-06-10T22:08:15.000000Z",
            "bio": "Hago directos para pasarla bien c:",
            "country": "",
            "state": "",
            "city": "",
            "instagram": "aquinoby2002_",
            "twitter": "AQUINOby_02",
            "youtube": "@AQUISI_",
            "discord": "",
            "tiktok": "@aquino586",
            "facebook": "",
            "gender": null,
            "profile_pic": "https:\/\/files.kick.com\/images\/user\/6425882\/profile_image\/conversion\/a6de4041-b5ad-4d82-8da3-c0a3eecabc95-thumb.webp"
        }
    },
    {
        "name": "Global",
        "id": "Global",
        "emotes":emotes
    },
    {
        "name": "Emojis",
        "id": "Emoji",
        "emotes":emotes
    }
] as const;
// kick chat
export const kickData = {

  "id": "d14450d5-d48e-4719-960b-8d53d4d36dd2",
  "chatroom_id": 4398608,
  "content": "probando",
  "type": "message",
  "created_at": "2026-03-25T22:37:37+00:00",
  "sender": {
    "id": 57654164,
    "username": "memelcer",
    "slug": "memelcer",
    "identity": {
      "color": "#75FD46",
      "badges": []
    }
  },
  "metadata": {
    "message_ref": "1774478256973"
  }
} as const;
//kick reward channel points 
export const kickReward = {
  "reward_title": "tts",
  "user_id": 57654164,
  "channel_id": 56523912,
  "username": "memelcer",
  "user_input": "hola",
  "reward_background_color": "#FFD899",
  "type": "reward_redeemed"
} as const;