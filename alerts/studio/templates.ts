import { AlertBuilder } from '../src';
import type { AlertTemplate } from './types';
import { chatData } from '../data/tiktok';
import { kickData as kickChatData,kickReward } from '../data/kick';
export const TemplateRegistry: Record<string, AlertTemplate> = {
  tiktokChat: {
    id: 'tiktok-chat',
    fields: [
      { id: 'user', label: 'Username', type: 'text', default: chatData.uniqueId },
      { id: 'msg', label: 'Message', type: 'text', default: chatData.comment },
      { id: 'pfp', label: 'Avatar', type: 'image', default: chatData.profilePictureUrl }
    ],
    build: (v, c) => {
      console.log( v , c, chatData );
      return new AlertBuilder()
      .id('tiktok-chat-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'image', id: 'pfp', src: v.pfp, style: { width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', objectFit: 'cover' } },
        { 
          type: 'container', id: 'text-info',
          children: [
            { type: 'text', id: 'name', content: v.user, style: { fontWeight: 900, fontSize: 24, color: '#ffffff' } },
            { type: 'text', id: 'msg', content: v.msg, style: { fontSize: 18, opacity: 0.9, color: '#ffffff' } }
          ],
          layout: { display: 'flex', flexDirection: 'column' },
          style: { marginLeft: '15px' }
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '25px', padding: '20px 40px', animation: c.anim })
      .build()
    }
  },
  kickChat: {
    id: 'kick-chat',
    fields: [
      { id: 'user', label: 'Username', type: 'text', default: kickChatData.sender.username },
      { id: 'msg', label: 'Message', type: 'text', default: kickChatData.content },
      { id: 'pfp', label: 'Avatar', type: 'image', default: 'https://placehold.co/100x100' }
    ],
    build: (v, c) => {
      console.log( v , c, kickChatData );
      // is better always preprocess to get url and pass with context, default not exist always use fetch or make cache
      //const profilePic = fetch(`https://kick.com/api/v2/channels/${kickChatData.sender.username}`);
      return new AlertBuilder()
      .id('kick-chat-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'image', id: 'pfp', src: v.pfp, style: { width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', objectFit: 'cover' } },
        { 
          type: 'container', id: 'text-info',
          children: [
            { type: 'text', id: 'name', content: v.user, style: { fontWeight: 900, fontSize: 24, color: '#ffffff' } },
            { type: 'text', id: 'msg', content: v.msg, style: { fontSize: 18, opacity: 0.9, color: '#ffffff' } }
          ],
          layout: { display: 'flex', flexDirection: 'column' },
          style: { marginLeft: '15px' }
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '25px', padding: '20px 40px', animation: c.anim })
      .build()
    }
  },
  kickReward: {
    id: 'kick-reward',
    fields: [
      { id: 'user', label: 'Username', type: 'text', default: kickReward.username },
      { id: 'msg', label: 'Message', type: 'text', default: kickReward.reward_title + ": " + kickReward.user_input },
      { id: 'pfp', label: 'Avatar', type: 'image', default: 'https://placehold.co/100x100' }
    ],
    build: (v, c) => {
      console.log( v , c, kickReward );
      // is better always preprocess to get url and pass with context, default not exist always use fetch or make cache
      //const profilePic = fetch(`https://kick.com/api/v2/channels/${kickReward.sender.username}`);
      return new AlertBuilder()
      .id('kick-reward-' + Date.now())
      .duration(c.duration)
      .container([
        { type: 'image', id: 'pfp', src: v.pfp, style: { width: 50, height: 50, borderRadius: '50%', overflow: 'hidden', objectFit: 'cover' } },
        { 
          type: 'container', id: 'text-info',
          children: [
            { type: 'text', id: 'name', content: v.user, style: { fontWeight: 900, fontSize: 24, color: '#ffffff' } },
            { type: 'text', id: 'msg', content: v.msg, style: { fontSize: 18, opacity: 0.9, color: '#ffffff' } }
          ],
          layout: { display: 'flex', flexDirection: 'column' },
          style: { marginLeft: '15px' }
        }
      ], { layout: { display: 'flex', alignItems: 'center' } })
      .style({ position: 'center', background: 'rgba(15, 23, 42, 0.5)', borderRadius: '25px', padding: '20px 40px', animation: c.anim })
      .build()
    }
  }
};
// render options for templateSelector
function renderTemplateOptions() {
  const templateSelector = document.getElementById('templateSelector');
  if (!templateSelector) return;
  Object.keys(TemplateRegistry).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.text = TemplateRegistry[key].id;
    templateSelector.appendChild(option);
  });
}
renderTemplateOptions();