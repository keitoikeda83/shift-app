export default function ApplicationHeaderLogo(props) {
    return (
        <img 
            {...props} 
            src="/images/麦源ロゴ_灰色.png"
            alt="アプリのロゴ" 
            className="w-32 h-32 object-contain ml-[-24px]"
        />
    );
}
