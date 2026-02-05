import React from 'react';

interface InstagramFeedMockupProps {
  username?: string;
  profileImage?: string;
  postImage?: string;
  likes?: number;
  caption?: string;
  comments?: Array<{ username: string; text: string }>;
  location?: string;
  dateLabel?: string;
  likedBy?: string;
}

const styles = `.rectangle {
  width: 375px;
  height: 54px;
  left: 0px;
  top: 0px;
  position: absolute;
  background: white;
  box-shadow: 0px 0.33000001311302185px 0px rgba(60, 60, 67, 0.29);
}

.tokyojapan_span {
  color: #262626;
  font-size: 11px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  letter-spacing: 0.07px;
  word-wrap: break-word;
}

.tokyo-japan {
  left: 52px;
  top: 30px;
  position: absolute;
}

.joshua_l_span {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 600;
  line-height: 18px;
  word-wrap: break-word;
}

.joshua_l {
  left: 52px;
  top: 11px;
  position: absolute;
}

.oval {
  width: 32px;
  height: 32px;
  left: 10px;
  top: 11px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.rectangle_01 {
  width: 375px;
  height: 375px;
  left: 0px;
  top: 240px;
  position: absolute;
}

.rectangle_02 {
  width: 34px;
  height: 26px;
  left: 0px;
  top: 0px;
  position: absolute;
  background: rgba(18, 18, 18, 0.70);
  border-radius: 13px;
}

.f3_span {
  color: #F9F9F9;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.text-13 {
  left: 8px;
  top: 6px;
  position: absolute;
}

.rectangle_03 {
  width: 375px;
  height: 147px;
  left: 0px;
  top: 0px;
  position: absolute;
  background: white;
}

.september19_span {
  color: rgba(0, 0, 0, 0.40);
  font-size: 11px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  letter-spacing: 0.05px;
  word-wrap: break-word;
}

.september-19 {
  left: 15px;
  top: 121px;
  position: absolute;
}

.joshua_lthegamein_span_01 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 600;
  line-height: 18px;
  word-wrap: break-word;
}

.joshua_lthegamein_span_02 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  line-height: 18px;
  word-wrap: break-word;
}

.joshua_lthegamein_span_03 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  line-height: 18px;
  word-wrap: break-word;
}

.joshua_l-the-game-in {
  width: 345px;
  left: 15px;
  top: 72px;
  position: absolute;
}

.likedbycraig_love_span_01 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  line-height: 18px;
  word-wrap: break-word;
}

.likedbycraig_love_span_02 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 600;
  line-height: 18px;
  word-wrap: break-word;
}

.likedbycraig_love_span_03 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  line-height: 18px;
  word-wrap: break-word;
}

.likedbycraig_love_span_04 {
  color: #262626;
  font-size: 13px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 600;
  line-height: 18px;
  word-wrap: break-word;
}

.liked-by-craig_love {
  left: 24px;
  top: 0px;
  position: absolute;
}

.oval_01 {
  width: 17px;
  height: 17px;
  left: 0.50px;
  top: 2px;
  position: absolute;
}

.oval_02 {
  width: 6px;
  height: 6px;
  left: 174.50px;
  top: 21px;
  position: absolute;
  background: #3897F0;
}

.oval_03 {
  width: 6px;
  height: 6px;
  left: 184.50px;
  top: 21px;
  position: absolute;
  background: rgba(0, 0, 0, 0.15);
}

.oval_04 {
  width: 6px;
  height: 6px;
  left: 194.50px;
  top: 21px;
  position: absolute;
  background: rgba(0, 0, 0, 0.15);
}

.mask {
  width: 375px;
  height: 98px;
  left: 0px;
  top: 88px;
  position: absolute;
  background: white;
  box-shadow: 0px 0.33000001311302185px 0px rgba(60, 60, 67, 0.29);
}

.mask_01 {
  width: 375px;
  height: 98px;
  left: 0px;
  top: 88px;
  position: absolute;
  background: white;
  box-shadow: 0px 0.33000001311302185px 0px rgba(60, 60, 67, 0.29);
}

.oval-copy {
  width: 62px;
  height: 62px;
  left: 10px;
  top: 97px;
  position: absolute;
  outline: 2px #FBAA47 solid;
  outline-offset: -1px;
}

.inner-oval {
  width: 56px;
  height: 56px;
  left: 13px;
  top: 100px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.yourstory_span {
  color: #262626;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.your-story {
  left: 11.50px;
  top: 164px;
  position: absolute;
  text-align: center;
}

.oval-copy_01 {
  width: 62px;
  height: 62px;
  left: 174px;
  top: 97px;
  position: absolute;
  outline: 2px #FBAA47 solid;
  outline-offset: -1px;
}

.inner-oval_01 {
  width: 56px;
  height: 56px;
  left: 177px;
  top: 100px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.zackjohn_span {
  color: #262626;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.zackjohn {
  left: 179.50px;
  top: 164px;
  position: absolute;
  text-align: center;
}

.oval-copy_02 {
  width: 62px;
  height: 62px;
  left: 256px;
  top: 97px;
  position: absolute;
  outline: 2px #FBAA47 solid;
  outline-offset: -1px;
}

.inner-oval_02 {
  width: 56px;
  height: 56px;
  left: 259px;
  top: 100px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.kieron_d_span {
  color: #262626;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.kieron_d {
  left: 263px;
  top: 164px;
  position: absolute;
  text-align: center;
}

.oval-copy_03 {
  width: 62px;
  height: 62px;
  left: 338px;
  top: 97px;
  position: absolute;
  outline: 2px #FBAA47 solid;
  outline-offset: -1px;
}

.inner-oval_03 {
  width: 56px;
  height: 56px;
  left: 341px;
  top: 100px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.craig_love_span {
  color: #262626;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.craig_love {
  left: 340.50px;
  top: 164px;
  position: absolute;
  text-align: center;
}

.oval-copy_04 {
  width: 62px;
  height: 62px;
  left: 92px;
  top: 97px;
  position: absolute;
  outline: 2px #E20337 solid;
  outline-offset: -1px;
}

.inner-oval_04 {
  width: 56px;
  height: 56px;
  left: 95px;
  top: 100px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.karennne_span {
  color: #262626;
  font-size: 12px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 400;
  word-wrap: break-word;
}

.karennne {
  left: 97px;
  top: 164px;
  position: absolute;
  text-align: center;
}

.rectangle_04 {
  width: 26px;
  height: 16px;
  left: 110px;
  top: 148px;
  position: absolute;
  background: linear-gradient(126deg, #C90083 0%, #D22463 22%, #E10038 100%);
  border-radius: 3px;
  outline: 2px #FEFEFE solid;
  outline-offset: -1px;
}

.live_span {
  color: #FEFEFE;
  font-size: 8px;
  font-family: "SF Pro Display", "Inter", sans-serif;
  font-weight: 500;
  letter-spacing: 0.50px;
  word-wrap: break-word;
}

.live {
  left: 114px;
  top: 151px;
  position: absolute;
  text-align: center;
}

.rectangle_05 {
  width: 375px;
  height: 79px;
  left: 0px;
  top: 733px;
  position: absolute;
  background: #FAFAFA;
  box-shadow: 0px -0.33000001311302185px 0px #A6A6AA;
}

.rectangle_06 {
  width: 75px;
  height: 50px;
  left: 300px;
  top: 733px;
  position: absolute;
  background: rgba(250, 250, 250, 0);
}

.oval_05 {
  width: 23px;
  height: 23px;
  left: 326px;
  top: 744px;
  position: absolute;
  border: 0.50px rgba(0, 0, 0, 0.10) solid;
}

.rectangle_07 {
  width: 75px;
  height: 50px;
  left: 225px;
  top: 733px;
  position: absolute;
  background: rgba(250, 250, 250, 0);
}

.rectangle_08 {
  width: 75px;
  height: 50px;
  left: 150px;
  top: 733px;
  position: absolute;
  background: rgba(250, 250, 250, 0);
}

.rectangle_09 {
  width: 75px;
  height: 50px;
  left: 75px;
  top: 733px;
  position: absolute;
  background: rgba(250, 250, 250, 0);
}

.rectangle_10 {
  width: 75px;
  height: 50px;
  left: 0px;
  top: 733px;
  position: absolute;
  background: rgba(250, 250, 250, 0);
}

.shape_09 {
  width: 22px;
  height: 23.38px;
  left: 26px;
  top: 743.62px;
  position: absolute;
  background: #262626;
}

.rectangle_11 {
  width: 375px;
  height: 88px;
  left: 0px;
  top: 0px;
  position: absolute;
  background: #FAFAFA;
  box-shadow: 0px 0.33000001311302185px 0px #A6A6AA;
}

.oval_06 {
  width: 8px;
  height: 8px;
  left: 310px;
  top: 54.25px;
  position: absolute;
  background: #ED4956;
}

.rectangle--background {
  width: 375px;
  height: 44px;
  left: 0px;
  top: 0px;
  position: absolute;
}

.rectangle_15 {
  width: 18px;
  height: 6.50px;
  left: 338px;
  top: 20px;
  position: absolute;
  background: #060606;
  border-radius: 1px;
}

.f41_span {
  color: #171717;
  font-size: 15px;
  font-family: "SF Pro Text", "Inter", sans-serif;
  font-weight: 600;
  word-wrap: break-word;
}

.text-941 {
  width: 54px;
  left: 0px;
  top: 0px;
  position: absolute;
  text-align: center;
}

.rectangle--background_01 {
  width: 375px;
  height: 34px;
  left: 0px;
  top: 0px;
  position: absolute;
}

.line {
  width: 134px;
  height: 5px;
  left: 121px;
  top: 20px;
  position: absolute;
  background: #060606;
  border-radius: 100px;
}

.time-style {
  width: 54px;
  height: 18px;
  left: 21px;
  top: 14px;
  position: absolute;
  overflow: hidden;
}

.post-top {
  width: 375px;
  height: 54px;
  left: 0px;
  top: 186px;
  position: absolute;
  overflow: hidden;
}

.photo-number {
  width: 34px;
  height: 26px;
  left: 327px;
  top: 254px;
  position: absolute;
  overflow: hidden;
}

.likes-info {
  width: 263px;
  height: 19px;
  left: 15px;
  top: 48px;
  position: absolute;
  overflow: hidden;
}

.bars-home-indicator {
  width: 375px;
  height: 34px;
  left: 0px;
  top: 778px;
  position: absolute;
  overflow: hidden;
}

.bars-status-bar-iphone-x {
  width: 375px;
  height: 44px;
  left: 0px;
  top: 0px;
  position: absolute;
  overflow: hidden;
}

.post-bottom {
  width: 375px;
  height: 147px;
  left: 0px;
  top: 615px;
  position: absolute;
  overflow: hidden;
}

.instagram-main {
  width: 375px;
  height: 812px;
  position: relative;
  background: white;
  overflow: hidden;
}`;

export const InstagramFeedMockup: React.FC<InstagramFeedMockupProps> = ({
  username = 'joshua_l',
  profileImage = '',
  postImage = '',
  likes = 44686,
  caption = 'The game in Japan was amazing and I want to share some photos',
  comments = [],
  location = 'Tokyo, Japan',
  dateLabel = 'September 19',
  likedBy,
}) => {
  const assetBase = '/ux/instagram-figma';
  const resolvedProfileImage = profileImage || `${assetBase}/Oval_32x32.png`;
  const resolvedPostImage = postImage || `${assetBase}/Rectangle_375x375.png`;
  const resolvedLikedBy = likedBy || comments[0]?.username || 'craig_love';
  const likesLabel = typeof likes === 'number' ? likes.toLocaleString('en-US') : String(likes);

  return (
    <>
      <div className="instagram-main">
        <div className="post-top">
          <div className="rectangle"></div>
          <div className="tokyo-japan"><span className="tokyojapan_span">{location}</span></div>
          <div className="joshua_l"><span className="joshua_l_span">{username}</span></div>
          <img className="oval" src={resolvedProfileImage} alt={`${username} avatar`} />
        </div>
        <img className="rectangle_01" src={resolvedPostImage} alt="Post" />
        <div className="photo-number">
          <div className="rectangle_02"></div>
          <div className="text-13"><span className="f3_span">1/3</span></div>
        </div>
        <div className="post-bottom">
          <div className="rectangle_03"></div>
          <div className="september-19"><span className="september19_span">{dateLabel}</span></div>
          <div className="joshua_l-the-game-in">
            <span className="joshua_lthegamein_span_01">{username}</span>
            <span className="joshua_lthegamein_span_02"> </span>
            <span className="joshua_lthegamein_span_03">{caption}</span>
          </div>
          <div className="likes-info">
            <div className="liked-by-craig_love">
              <span className="likedbycraig_love_span_01">Liked by </span>
              <span className="likedbycraig_love_span_02">{resolvedLikedBy}</span>
              <span className="likedbycraig_love_span_03"> and </span>
              <span className="likedbycraig_love_span_04">{likesLabel} others</span>
            </div>
            <img className="oval_01" src={`${assetBase}/Oval_17x17.png`} alt="Like" />
          </div>
          <div className="oval_02"></div>
          <div className="oval_03"></div>
          <div className="oval_04"></div>
        </div>
        <div className="mask"></div>
        <div className="mask_01"></div>
        <div className="oval-copy"></div>
        <img className="inner-oval" src={`${assetBase}/Inner_Oval_56x56.png`} alt="Story" />
        <div className="your-story"><span className="yourstory_span">Your Story</span></div>
        <div className="oval-copy_01"></div>
        <img className="inner-oval_01" src={`${assetBase}/Inner_Oval_56x56_1.png`} alt="Story" />
        <div className="zackjohn"><span className="zackjohn_span">zackjohn</span></div>
        <div className="oval-copy_02"></div>
        <img className="inner-oval_02" src={`${assetBase}/Inner_Oval_56x56_2.png`} alt="Story" />
        <div className="kieron_d"><span className="kieron_d_span">kieron_d</span></div>
        <div className="oval-copy_03"></div>
        <img className="inner-oval_03" src={`${assetBase}/Inner_Oval_56x56_3.png`} alt="Story" />
        <div className="craig_love"><span className="craig_love_span">craig_love</span></div>
        <div className="oval-copy_04"></div>
        <img className="inner-oval_04" src={`${assetBase}/Inner_Oval_56x56_4.png`} alt="Story" />
        <div className="karennne"><span className="karennne_span">karennne</span></div>
        <div className="rectangle_04"></div>
        <div className="live"><span className="live_span">LIVE</span></div>
        <div className="rectangle_05"></div>
        <div className="rectangle_06"></div>
        <img className="oval_05" src={`${assetBase}/Oval_23x23.png`} alt="Live" />
        <div className="rectangle_07"></div>
        <div className="rectangle_08"></div>
        <div className="rectangle_09"></div>
        <div className="rectangle_10"></div>
        <div className="shape_09"></div>
        <div className="rectangle_11"></div>
        <div className="oval_06"></div>
        <div className="bars-status-bar-iphone-x">
          <div className="rectangle--background"></div>
          <div className="rectangle_15"></div>
          <div className="time-style">
            <div className="text-941"><span className="f41_span">9:41</span></div>
          </div>
        </div>
        <div className="bars-home-indicator">
          <div className="rectangle--background_01"></div>
          <div className="line"></div>
        </div>
      </div>
      <style jsx>{styles}</style>
    </>
  );
};
