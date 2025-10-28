import React from 'react';
import { User, UserRole } from '../types';
import RankingInput from './RankingInput';

interface RankingProps {
  users: User[];
}

const Ranking: React.FC<RankingProps> = ({ users }) => {

  const calculateRankings = (role: UserRole) => {
    return users
      .filter(user => user.role.includes(role))
      .sort((a, b) => {
        if (b.ratings.average !== a.ratings.average) {
          return b.ratings.average - a.ratings.average;
        }
        return b.ratings.count - a.ratings.count; // Tie-breaker
      })
      .slice(0, 5);
  };
  
  const sellerRankings = calculateRankings(UserRole.Seller);
  const buyerRankings = calculateRankings(UserRole.Buyer);
  const carrierRankings = calculateRankings(UserRole.Carrier);

  const RankingList = ({ title, data }: { title: string, data: User[] }) => (
    <div className="mb-6">
      <h3 className="text-lg font-bold text-brand-text-primary mb-3">{title}</h3>
      <ul className="space-y-2">
        {data.length > 0 ? data.map((user, index) => (
           <li key={user.id} className="flex justify-between items-center bg-brand-background p-2 rounded-md">
            <span className="text-sm text-brand-text-secondary truncate"><span className="font-bold text-brand-primary">{index + 1}.</span> {user.name}</span>
            <div className="flex items-center gap-2">
               <RankingInput readOnly currentRating={user.ratings.average} size="sm" />
               <span className="text-xs font-semibold text-brand-primary w-8 text-right">({user.ratings.count})</span>
            </div>
          </li>
        )) : <p className="text-xs text-brand-text-secondary">No rated users yet.</p>}
      </ul>
    </div>
  );


  return (
    <div className="bg-brand-surface p-6 rounded-xl shadow-2xl shadow-slate-900/50 sticky top-24 border border-slate-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-brand-text-primary">Top Performers</h2>
      <RankingList title="Top Sellers" data={sellerRankings} />
      <RankingList title="Top Buyers" data={buyerRankings} />
      <RankingList title="Top Carriers" data={carrierRankings} />
    </div>
  );
};

export default Ranking;