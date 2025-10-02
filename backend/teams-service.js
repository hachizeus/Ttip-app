import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';
import { sendTipNotification } from './sms.mjs';
import crypto from 'crypto';

configDotenv();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Store invite tokens temporarily (use Redis in production)
const inviteTokens = new Map();

export const createTeam = async (teamName, ownerId) => {
    try {
        const { data, error } = await supabase
            .from('teams')
            .insert({
                name: teamName,
                owner_id: ownerId,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating team:', error);
            return null;
        }
        
        // Add owner as team member
        await supabase
            .from('team_members')
            .insert({
                team_id: data.id,
                worker_id: ownerId,
                role: 'owner',
                status: 'active',
                joined_at: new Date().toISOString()
            });
        
        return data;
    } catch (error) {
        console.error('Error creating team:', error);
        return null;
    }
};

export const inviteWorkerToTeam = async (teamId, workerPhone, inviterName) => {
    try {
        // Generate unique invite token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        // Store invite token
        inviteTokens.set(token, {
            teamId,
            workerPhone,
            expiresAt,
            used: false
        });
        
        // Get team details
        const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', teamId)
            .single();
        
        if (!team) {
            throw new Error('Team not found');
        }
        
        // Send SMS invite
        const inviteMessage = `🎉 ${inviterName} invited you to join team "${team.name}" on TTip! Accept: https://ttip-app.onrender.com/teams/accept?token=${token} (Expires in 7 days)`;
        
        await sendTipNotification(workerPhone, 0); // Reuse SMS function
        
        console.log(`Team invite sent to ${workerPhone} for team ${team.name}`);
        return { token, expiresAt };
        
    } catch (error) {
        console.error('Error sending team invite:', error);
        return null;
    }
};

export const acceptTeamInvite = async (token, workerId) => {
    try {
        const invite = inviteTokens.get(token);
        
        if (!invite) {
            return { success: false, error: 'Invalid invite token' };
        }
        
        if (invite.used) {
            return { success: false, error: 'Invite already used' };
        }
        
        if (new Date() > invite.expiresAt) {
            inviteTokens.delete(token);
            return { success: false, error: 'Invite expired' };
        }
        
        // Check if worker already in team
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', invite.teamId)
            .eq('worker_id', workerId)
            .single();
        
        if (existingMember) {
            return { success: false, error: 'Already a team member' };
        }
        
        // Add worker to team
        const { error } = await supabase
            .from('team_members')
            .insert({
                team_id: invite.teamId,
                worker_id: workerId,
                role: 'member',
                status: 'active',
                joined_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Error adding team member:', error);
            return { success: false, error: 'Failed to join team' };
        }
        
        // Mark invite as used
        invite.used = true;
        inviteTokens.set(token, invite);
        
        // Get team name for response
        const { data: team } = await supabase
            .from('teams')
            .select('name')
            .eq('id', invite.teamId)
            .single();
        
        return { success: true, teamName: team?.name };
        
    } catch (error) {
        console.error('Error accepting team invite:', error);
        return { success: false, error: 'Failed to accept invite' };
    }
};

export const getTeamStats = async (teamId) => {
    try {
        // Get team members
        const { data: members } = await supabase
            .from('team_members')
            .select(`
                worker_id,
                role,
                joined_at,
                workers(name, phone, total_tips, tip_count)
            `)
            .eq('team_id', teamId)
            .eq('status', 'active');
        
        if (!members) return null;
        
        // Calculate team totals
        const totalTips = members.reduce((sum, member) => sum + (member.workers?.total_tips || 0), 0);
        const totalTransactions = members.reduce((sum, member) => sum + (member.workers?.tip_count || 0), 0);
        
        return {
            members: members.length,
            totalTips,
            totalTransactions,
            memberDetails: members
        };
        
    } catch (error) {
        console.error('Error getting team stats:', error);
        return null;
    }
};